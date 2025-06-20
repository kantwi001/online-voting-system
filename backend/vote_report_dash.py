import dash
from dash import dcc, html
import dash_bootstrap_components as dbc
import plotly.express as px
import requests
from dash.dependencies import Input, Output

# Configuration
BACKEND_URL = 'http://localhost:5000/admin/vote_report/'  # Adjust if backend runs elsewhere

app = dash.Dash(__name__, external_stylesheets=[dbc.themes.BOOTSTRAP])

app.layout = dbc.Container([
    dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardHeader(html.H2('Election Results Dashboard', className='mb-0', style={'color': '#1976d2'})),
                dbc.CardBody([
                    html.P('Select an election to view results, candidate votes, and participation statistics.', className='mb-4'),
                    dcc.Dropdown(id='election-dropdown', placeholder='Select election...', style={'marginBottom': 24}),
                    dbc.Row([
                        dbc.Col([
                            dcc.Graph(id='results-bar', config={'displayModeBar': False}),
                        ], md=8),
                        dbc.Col([
                            html.Div(id='results-summary', style={'marginTop': 10})
                        ], md=4)
                    ]),
                    html.Div(id='results-error', className='text-danger', style={'marginTop': 20, 'fontWeight': 500, 'fontSize': '1.1rem'})
                ])
            ], className='shadow-sm mb-5', style={'borderRadius': 18}),
            dbc.Card([
                dbc.CardHeader(html.H2('Election Participation Overview', className='mb-0', style={'color': '#1976d2'})),
                dbc.CardBody([
                    html.P('This chart shows the number of eligible voters, number who voted, and number of candidates for each election.', className='mb-4'),
                    dcc.Graph(id='summary-bar', config={'displayModeBar': False}),
                    html.Div(id='summary-error', className='text-danger', style={'marginTop': 12, 'fontWeight': 500, 'fontSize': '1.05rem'})
                ])
            ], className='shadow-sm', style={'borderRadius': 18})
        ], width=12, lg=10, className='mx-auto')
    ], className='justify-content-center mt-5')
], fluid=True)

@app.callback(
    Output('election-dropdown', 'options'),
    Output('election-dropdown', 'value'),
    Input('election-dropdown', 'id')
)
def load_elections(_):
    try:
        resp = requests.get('http://localhost:5001/elections')
        if resp.status_code != 200:
            return [], None
        data = resp.json()
        options = [{'label': e['title'], 'value': e['id']} for e in data]
        return options, options[0]['value'] if options else None
    except Exception:
        return [], None

@app.callback(
    Output('results-bar', 'figure'),
    Output('results-summary', 'children'),
    Output('results-error', 'children'),
    Input('election-dropdown', 'value')
)
def update_results(election_id):
    import pandas as pd
    if not election_id:
        return {}, '', ''
    try:
        # Get election/candidates info
        elections_resp = requests.get('http://localhost:5001/elections')
        elections = elections_resp.json()
        election = next((e for e in elections if e['id'] == election_id), None)
        if not election:
            return {}, '', 'Election not found.'
        candidates = election['candidates']
        # Get results
        results_resp = requests.get(f'http://localhost:5001/results/{election_id}?username=kantwi')
        if results_resp.status_code != 200:
            return {}, '', 'Unauthorized or no results.'
        results = results_resp.json()
        # Get summary stats
        summary_resp = requests.get('http://localhost:5000/admin/election_summary', headers={'username': 'kantwi'})
        summary = summary_resp.json()
        summ = next((s for s in summary if s['title'] == election['title']), None)
        # Prepare bar chart data
        df = pd.DataFrame([
            {
                'Candidate': c['name'],
                'Votes': results.get(c['name'], {}).get('votes', 0),
                'Photo': c.get('photo_url')
            } for c in candidates
        ])
        fig = px.bar(
            df,
            x='Votes',
            y='Candidate',
            orientation='h',
            text='Votes',
            color='Candidate',
            color_discrete_sequence=px.colors.qualitative.Safe
        )
        fig.update_traces(
            textposition='outside',
            hovertemplate='<b>%{y}</b><br>Votes: %{x}<extra></extra>'
        )
        fig.update_layout(
            plot_bgcolor='white',
            paper_bgcolor='white',
            font=dict(family='Inter, sans-serif', size=16),
            margin=dict(l=80, r=30, t=10, b=40),
            xaxis=dict(showgrid=True, gridcolor='#eee', zeroline=False),
            yaxis=dict(showgrid=False),
            showlegend=False
        )
        # Candidate avatars
        photos = [c.get('photo_url') for c in candidates]
        if any(photos):
            fig.update_layout(
                yaxis_tickmode='array',
                yaxis_tickvals=df['Candidate'],
                yaxis_ticktext=[
                    f'<img src="{p}" style="height:32px;width:32px;border-radius:50%;vertical-align:middle;margin-right:8px;"> {n}' if p else n
                    for n, p in zip(df['Candidate'], photos)
                ]
            )
        # Summary stats
        if summ:
            turnout = (summ['voted'] / summ['voters'] * 100) if summ['voters'] else 0
            summary_html = html.Div([
                html.H5('Election Stats', style={'color': '#1976d2', 'marginBottom': 10}),
                html.P(f"Eligible Voters: {summ['voters']}", style={'marginBottom': 2}),
                html.P(f"Voted: {summ['voted']}", style={'marginBottom': 2}),
                html.P(f"Candidates: {summ['candidates']}", style={'marginBottom': 2}),
                html.P(f"Turnout: {turnout:.1f}%", style={'fontWeight': 600, 'color': '#43a047'})
            ])
        else:
            summary_html = ''
        return fig, summary_html, ''
    except Exception as e:
        return {}, '', f'Error: {str(e)}'

@app.callback(
    [Output('summary-bar', 'figure'), Output('summary-error', 'children')],
    [Input('summary-bar', 'id')]
)
def update_summary(_):
    try:
        resp = requests.get('http://localhost:5000/admin/election_summary', headers={'username': 'kantwi'})
        if resp.status_code != 200:
            return dash.no_update, f'Error: {resp.json().get("message", "Unauthorized or not found")}'
        data = resp.json()
        if not data:
            return dash.no_update, 'No elections found.'
        titles = [e['title'] for e in data]
        voters = [e['voters'] for e in data]
        voted = [e['voted'] for e in data]
        candidates = [e['candidates'] for e in data]
        import pandas as pd
        df = pd.DataFrame({
            'Election': titles * 3,
            'Count': voters + voted + candidates,
            'Category': ['Eligible Voters'] * len(titles) + ['Voted'] * len(titles) + ['Candidates'] * len(titles)
        })
        fig = px.bar(
            df,
            x='Election',
            y='Count',
            color='Category',
            barmode='group',
            text_auto=True,
            color_discrete_map={
                'Eligible Voters': '#1976d2',
                'Voted': '#43a047',
                'Candidates': '#ffa000'
            },
            category_orders={'Category': ['Eligible Voters', 'Voted', 'Candidates']}
        )
        fig.update_layout(
            plot_bgcolor='white',
            paper_bgcolor='white',
            font=dict(family='Inter, sans-serif', size=15),
            margin=dict(l=50, r=30, t=10, b=40),
            xaxis=dict(showgrid=False),
            yaxis=dict(showgrid=True, gridcolor='#eee', zeroline=False),
            legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1)
        )
        fig.update_traces(textposition='outside')
        return fig, ''
    except Exception as e:
        return dash.no_update, f'Error: {str(e)}'

@app.callback(
    [Output('bar-chart', 'figure'), Output('error-msg', 'children')],
    [Input('bar-chart', 'id')]
)
def update_chart(_):
    election_id = 1  # DKT WELFARE
    try:
        resp = requests.get(f'{BACKEND_URL}{election_id}', headers={'username': 'kantwi'})
        if resp.status_code != 200:
            return dash.no_update, f'Error: {resp.json().get("message", "Unauthorized or not found")}'
        data = resp.json()
        if not data:
            return dash.no_update, 'No data for this election.'
        names = list(data.keys())
        votes = list(data.values())
        fig = px.bar(
            x=votes,
            y=names,
            orientation='h',
            labels={'x': 'Votes', 'y': 'Candidate'},
            title='',
            color=names,
            color_discrete_sequence=px.colors.qualitative.Safe
        )
        fig.update_layout(
            plot_bgcolor='white',
            paper_bgcolor='white',
            font=dict(family='Inter, sans-serif', size=16),
            margin=dict(l=80, r=30, t=10, b=40),
            xaxis=dict(showgrid=True, gridcolor='#eee', zeroline=False),
            yaxis=dict(showgrid=False),
            showlegend=False
        )
        return fig, ''
    except Exception as e:
        return dash.no_update, f'Error: {str(e)}'

if __name__ == '__main__':
    app.run(debug=True, port=8050)
