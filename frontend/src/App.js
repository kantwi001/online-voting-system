import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Button, TextField, Typography, Card, CardContent, CardActions, Grid, Alert, Snackbar, Container, Paper, Avatar, Stack, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DashboardLayout from './DashboardLayout';
import CandidatePhotoInput from './CandidatePhotoInput';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const api = 'http://127.0.0.1:8080';

function App() {
  // UI State
  const [view, setView] = useState('login');
  const [changePw, setChangePw] = useState({ current: '', new: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [smtp, setSmtp] = useState({ smtp_host: '', smtp_port: '', smtp_user: '', smtp_password: '', smtp_from: '', smtp_tls: true });
  const [smtpMsg, setSmtpMsg] = useState('');
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState(null);
  const [role, setRole] = useState(null); // 'admin' or 'user'
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [voteMsg, setVoteMsg] = useState('');
  const [results, setResults] = useState(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsElectionTitle, setResultsElectionTitle] = useState('');
  const [newElection, setNewElection] = useState({ title: '', candidates: [] });
  const [error, setError] = useState('');
  // Added for improved UX
  const [successMsg, setSuccessMsg] = useState('');
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (view === 'dashboard') {
      axios.get(`${api}/elections`).then(res => setElections(res.data));
    }
  }, [view]);

  const handleRegister = () => {
    axios.post(`${api}/register`, { username, password })
      .then(() => { setError(''); setView('login'); })
      .catch(e => {
        if (e.response && e.response.data && e.response.data.message) {
          setError('Registration failed: ' + e.response.data.message);
        } else {
          setError('Registration failed: ' + (e.message || 'Unknown error'));
        }
      });
  };

  const handleLogin = () => {
    axios.post(`${api}/login`, { username, password })
      .then(res => { setUserId(res.data.user_id); setRole(res.data.role); setView('dashboard'); })
      .catch(e => setError(e.response?.data?.message || 'Login failed'));
  };

  const handleCreateElection = async () => {
    setError('');
    // Only send candidates with a name, and remove _file property
    const validCandidates = newElection.candidates
      .filter(c => c.name && c.name.trim())
      .map(c => {
        const { _file, ...rest } = c;
        return rest;
      });
    if (!newElection.title || validCandidates.length === 0) {
      setError('Election title and at least one candidate with a name are required.');
      return;
    }
    try {
      await axios.post(`${api}/elections`, { title: newElection.title, candidates: validCandidates, username });
      setView('dashboard');
      setNewElection({ title: '', candidates: [] });
    } catch (e) {
      setError(e.response?.data?.message || 'Could not create election');
    }
  };

  const handleVote = (electionId, candidateId) => {
    axios.post(`${api}/vote`, { user_id: userId, election_id: electionId, candidate_id: candidateId })
      .then(res => {
        let msg = 'Vote cast!';
        if (typeof res.data.email_sent !== 'undefined') {
          if (res.data.email_sent) {
            msg += ' Confirmation email sent.';
          } else {
            msg += ' (Email not sent';
            if (res.data.email_error) msg += ': ' + res.data.email_error;
            msg += ')';
          }
        }
        setVoteMsg(msg);
      })
      .catch(e => setVoteMsg(e.response?.data?.message || 'Voting failed'));
  };



  // Navigation handler for DashboardLayout
  const handleNav = (target) => {
    if (target === 'logout') {
      setUserId(null);
      setUsername('');
      setPassword('');
      setRole(null);
      setView('login');
      setError('');
      setPwMsg('');
      setChangePw({ current: '', new: '', confirm: '' });
      setSmtpMsg('');
      // Do NOT clear SMTP state here
    } else {
      setView(target);
      setPwMsg('');
      setChangePw({ current: '', new: '', confirm: '' });
      setSmtpMsg('');
      if (target === 'settings' && role === 'admin') {
        fetchSmtpSettings();
      }
    }
  };

  const fetchSmtpSettings = async () => {
    setSmtpLoading(true);
    setSmtpMsg('');
    try {
      const res = await axios.get(`${api}/settings`, { params: { username } });
      setSmtp({
        smtp_host: res.data.smtp_host || '',
        smtp_port: res.data.smtp_port || '',
        smtp_user: res.data.smtp_user || '',
        smtp_password: res.data.smtp_password || '',
        smtp_from: res.data.smtp_from || '',
        smtp_tls: res.data.smtp_tls !== undefined ? res.data.smtp_tls : true
      });
    } catch (e) {
      setSmtpMsg('Failed to load SMTP settings');
    }
    setSmtpLoading(false);
  };

  // Login/Register forms (full page, centered)
  if (view === 'login' || view === 'register') {
    const isLogin = view === 'login';
    return (
      <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: 1 }}>
          <Typography variant="h5" align="center" gutterBottom>
            {isLogin ? 'Login' : 'Register'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Username" value={username} onChange={e => setUsername(e.target.value)} fullWidth />
            <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth />
            <Button variant="contained" color="primary" onClick={isLogin ? handleLogin : handleRegister} fullWidth>
              {isLogin ? 'Login' : 'Register'}
            </Button>
            <Button onClick={() => setView(isLogin ? 'register' : 'login')} fullWidth>
              {isLogin ? 'Register' : 'Back to Login'}
            </Button>
            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        </Paper>
      </Container>
    );
  }

  // Results handler for admin
  const handleViewResults = (electionId, electionTitle) => {
    axios.get(`${api}/results/${electionId}?username=${username}`)
      .then(res => {
        setResults(res.data);
        setResultsOpen(true);
        setResultsElectionTitle(electionTitle);
      })
      .catch(() => {
        setResults(null);
        setResultsOpen(false);
      });
  };

  // Dashboard & Create Election inside DashboardLayout
  return (
    <DashboardLayout selected={view} onSelect={handleNav} username={username} role={role}>
      {view === 'dashboard' && (
        <Box>
          <Typography variant="h4" sx={{ mb: 3, color: '#1976d2', fontWeight: 700 }}>Available Elections</Typography>
          <Grid container spacing={3}>
            {elections.map(e => (
              <Grid item xs={12} sm={6} md={4} key={e.id}>
                <Card elevation={2} sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="h6" color="primary" gutterBottom>{e.title}</Typography>
                    <Typography sx={{ fontWeight: 500, color: '#555', mb: 1 }}>Candidates:</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {e.candidates.map(c => (
                        <Paper key={c.id} sx={{ p: 1, px: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Avatar src={c.photo_url} alt={c.name} sx={{ width: 32, height: 32 }} />
                          <Typography>{c.name}</Typography>
                          <Button size="small" variant="contained" color="success" onClick={() => handleVote(e.id, c.id)} sx={{ ml: 1 }}>
                            Vote
                          </Button>
                          {role === 'admin' && username === 'kantwi' && (
  <Button size="small" variant="outlined" color="error"
    onClick={() => {
      setCandidateToDelete({ id: c.id, electionId: e.id });
      setConfirmOpen(true);
    }} sx={{ ml: 1 }}>
    Remove
  </Button>
)}
                        </Paper>
                      ))}
                      {/* Add Candidate Form (admin only) */}
                      {role === 'admin' && username === 'kantwi' && (
  <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
    <TextField size="small" label="New Candidate Name" value={e._newCandidateName || ''}
      onChange={ev => setElections(elections.map(el => el.id === e.id ? { ...el, _newCandidateName: ev.target.value } : el))} />
    <TextField size="small" label="Photo URL (optional)" value={e._newCandidatePhoto || ''}
      onChange={ev => setElections(elections.map(el => el.id === e.id ? { ...el, _newCandidatePhoto: ev.target.value } : el))} />
    <Button size="small" variant="contained" color="primary"
      disabled={e._addLoading}
      onClick={async () => {
        setElections(els => els.map(el => el.id === e.id ? { ...el, _addLoading: true } : el));
        try {
          await axios.post(`${api}/elections/${e.id}/candidates`, {
            name: e._newCandidateName,
            photo_url: e._newCandidatePhoto,
            username
          }, {
            headers: { 'Content-Type': 'application/json' }
          });
          // Refresh elections
          const res = await axios.get(`${api}/elections`);
          setElections(res.data);
          setSuccessMsg('Candidate added!');
        } catch (err) {
          setError('Failed to add candidate');
        }
        setElections(els => els.map(el => el.id === e.id ? { ...el, _addLoading: false, _newCandidateName: '', _newCandidatePhoto: '' } : el));
      }}>
      {e._addLoading ? 'Adding...' : 'Add'}
    </Button>
  </Box>
)}
                    </Box>
                  </CardContent>
                  <CardActions>
                    {role === 'admin' && username === 'kantwi' && (
                      <Button variant="outlined" color="primary" fullWidth onClick={() => handleViewResults(e.id, e.title)}>
                        View Results
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          {voteMsg && <Snackbar open autoHideDuration={3000} onClose={() => setVoteMsg('')}><Alert severity="success">{voteMsg}</Alert></Snackbar>}

          {/* Modern Results Dialog for admin */}
          <Dialog open={resultsOpen} onClose={() => setResultsOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
              Results for {resultsElectionTitle}
              <IconButton onClick={() => setResultsOpen(false)} size="large">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              {results && (
                <Box>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={Object.entries(results).map(([name, obj]) => ({ name, votes: obj.votes, photo_url: obj.photo_url }))}
                      layout="vertical"
                      margin={{ left: 30, right: 30, top: 20, bottom: 20 }}
                    >
                      <XAxis type="number" allowDecimals={false} tick={{ fontWeight: 700 }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontWeight: 700 }} />
                      <Tooltip formatter={(value) => [`${value} votes`, 'Votes']} />
                      <Bar dataKey="votes" fill="#1976d2">
                        {Object.entries(results).map(([name, obj], idx) => (
                          <Cell key={name} fill={['#1976d2', '#43a047', '#fbc02d', '#e53935', '#8e24aa'][idx % 5]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <Box sx={{ mt: 3 }}>
                    {Object.entries(results).map(([name, obj]) => (
                      <Stack direction="row" spacing={2} alignItems="center" key={name} sx={{ mb: 1 }}>
                        <Avatar src={obj.photo_url} alt={name} sx={{ width: 32, height: 32, border: '2px solid #1976d2' }} />
                        <Typography sx={{ fontWeight: 600, minWidth: 120 }}>{name}</Typography>
                        <Typography sx={{ color: '#1976d2', fontWeight: 700 }}>{obj.votes} votes</Typography>
                      </Stack>
                    ))}
                  </Box>
                </Box>
              )}
            </DialogContent>
          </Dialog>

        </Box>
      )}
      {view === 'changePassword' && (
        <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
          <Card elevation={5} sx={{ borderRadius: 4, p: { xs: 2, sm: 4 }, boxShadow: '0 4px 24px 0 rgba(25, 118, 210, 0.08)' }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#1976d2', letterSpacing: 1 }} align="center">
              Change Password
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Current Password"
                type="password"
                value={changePw.current}
                onChange={e => setChangePw({ ...changePw, current: e.target.value })}
                fullWidth
              />
              <TextField
                label="New Password"
                type="password"
                value={changePw.new}
                onChange={e => setChangePw({ ...changePw, new: e.target.value })}
                fullWidth
              />
              <TextField
                label="Confirm New Password"
                type="password"
                value={changePw.confirm}
                onChange={e => setChangePw({ ...changePw, confirm: e.target.value })}
                fullWidth
              />
              <Button
                variant="contained"
                color="primary"
                sx={{ mt: 1, fontWeight: 600, borderRadius: 2, boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.08)', transition: '0.2s', ':hover': { background: '#115293' } }}
                onClick={async () => {
                  setPwMsg('');
                  if (!changePw.current || !changePw.new) {
                    setPwMsg('Please fill all fields.');
                    return;
                  }
                  if (changePw.new !== changePw.confirm) {
                    setPwMsg('New passwords do not match.');
                    return;
                  }
                  try {
                    await axios.post(`${api}/change_password`, {
                      username,
                      current_password: changePw.current,
                      new_password: changePw.new
                    });
                    setPwMsg('Password changed successfully!');
                    setChangePw({ current: '', new: '', confirm: '' });
                  } catch (e) {
                    setPwMsg(
                      e.response?.data?.message || 'Failed to change password.'
                    );
                  }
                }}
                fullWidth
              >
                Change Password
              </Button>
              {pwMsg && <Alert severity={pwMsg.includes('success') ? 'success' : 'error'} sx={{ mt: 2 }}>{pwMsg}</Alert>}
            </Box>
          </Card>
        </Container>
      )}
      {view === 'settings' && role === 'admin' && (
        <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
          <Card elevation={5} sx={{ borderRadius: 4, p: { xs: 2, sm: 4 }, boxShadow: '0 4px 24px 0 rgba(25, 118, 210, 0.08)' }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#1976d2', letterSpacing: 1 }} align="center">
              SMTP Settings
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="SMTP Host" value={smtp.smtp_host} onChange={e => setSmtp({ ...smtp, smtp_host: e.target.value })} fullWidth />
              <TextField label="SMTP Port" type="number" value={smtp.smtp_port} onChange={e => setSmtp({ ...smtp, smtp_port: e.target.value })} fullWidth />
              <TextField label="SMTP Username" value={smtp.smtp_user} onChange={e => setSmtp({ ...smtp, smtp_user: e.target.value })} fullWidth />
              <TextField label="SMTP Password" type="password" value={smtp.smtp_password} onChange={e => setSmtp({ ...smtp, smtp_password: e.target.value })} fullWidth />
              <TextField label="From Email" value={smtp.smtp_from} onChange={e => setSmtp({ ...smtp, smtp_from: e.target.value })} fullWidth />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <input type="checkbox" checked={!!smtp.smtp_tls} id="smtp_tls" onChange={e => setSmtp({ ...smtp, smtp_tls: e.target.checked })} />
                <label htmlFor="smtp_tls" style={{ fontWeight: 500 }}>Use TLS</label>
              </Box>
              <Button
                variant="contained"
                color="primary"
                sx={{ mt: 1, fontWeight: 600, borderRadius: 2, boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.08)', transition: '0.2s', ':hover': { background: '#115293' } }}
                disabled={smtpLoading}
                onClick={async () => {
                  setSmtpMsg('');
                  setSmtpLoading(true);
                  try {
                    await axios.post(`${api}/settings`, { ...smtp, username });
                    setSmtpMsg('Settings updated successfully!');
                  } catch (e) {
                    setSmtpMsg(e.response?.data?.message || 'Failed to update SMTP settings.');
                  }
                  setSmtpLoading(false);
                }}
                fullWidth
              >
                Save Settings
              </Button>
              {smtpMsg && <Alert severity={smtpMsg.includes('success') ? 'success' : 'error'} sx={{ mt: 2 }}>{smtpMsg}</Alert>}
            </Box>
          </Card>
        </Container>
      )}
      {view === 'createElection' && role === 'admin' && (
        <Box sx={{ maxWidth: 480 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Create Election</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Election Title" value={newElection.title} onChange={e => setNewElection({ ...newElection, title: e.target.value })} fullWidth />
            <Typography variant="subtitle1" sx={{ mt: 2 }}>Candidates</Typography>
            {newElection.candidates.map((c, idx) => (
              <CandidatePhotoInput
                key={idx}
                value={c}
                onChange={val => {
                  const arr = [...newElection.candidates];
                  arr[idx] = val;
                  setNewElection({ ...newElection, candidates: arr });
                }}
              />
            ))}
            <Button variant="outlined" onClick={() => setNewElection({ ...newElection, candidates: [...newElection.candidates, { name: '', photo_url: '' }] })}>
              Add Candidate
            </Button>
            <Button variant="contained" color="primary" onClick={handleCreateElection}>
              Create
            </Button>
            <Button onClick={() => setView('dashboard')}>Cancel</Button>
            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        </Box>
      )}
      {/* Confirmation Dialog for Candidate Deletion */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Remove Candidate</DialogTitle>
        <DialogContent>
          Are you sure you want to remove this candidate? This action cannot be undone.
        </DialogContent>
        <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} color="primary" variant="outlined">Cancel</Button>
          <Button
            onClick={async () => {
              setConfirmOpen(false);
              if (!candidateToDelete) return;
              try {
                await axios.delete(`${api}/candidates/${candidateToDelete.id}`, {
                  data: { username },
                  headers: { 'Content-Type': 'application/json' }
                });
                // Refresh elections
                const res = await axios.get(`${api}/elections`);
                setElections(res.data);
                setSuccessMsg('Candidate removed!');
              } catch (err) {
                setError('Failed to remove candidate');
              }
              setCandidateToDelete(null);
            }}
            color="error"
            variant="contained"
          >
            Remove
          </Button>
        </CardActions>
      </Dialog>
      {/* Global Snackbars for Feedback */}
      <Snackbar
        open={!!successMsg}
        autoHideDuration={3000}
        onClose={() => setSuccessMsg('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMsg('')} severity="success" sx={{ width: '100%' }}>
          {successMsg}
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!error}
        autoHideDuration={4000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

export default App;
