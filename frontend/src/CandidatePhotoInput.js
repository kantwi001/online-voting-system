import React, { useRef } from 'react';
import { Box, TextField, Button, Avatar, Stack } from '@mui/material';

export default function CandidatePhotoInput({ value, onChange }) {
  const fileInput = useRef();

  // value: { name: string, photo_url: string }
  const handleFileChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    // Save file to public/candidates/ (handled outside React in real app), here just preview
    onChange({ ...value, photo_url: url, _file: file });
  };

  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
      <Avatar src={value.photo_url} alt={value.name} sx={{ width: 48, height: 48 }} />
      <TextField
        label="Candidate Name"
        value={value.name}
        onChange={e => onChange({ ...value, name: e.target.value })}
        sx={{ flex: 1 }}
      />
      <TextField
        label="Photo URL (optional)"
        value={value.photo_url || ''}
        onChange={e => onChange({ ...value, photo_url: e.target.value, _file: undefined })}
        sx={{ flex: 2 }}
      />
      <Button variant="outlined" component="span" onClick={() => fileInput.current.click()}>
        Upload
      </Button>
      <input
        type="file"
        accept="image/*"
        ref={fileInput}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </Stack>
  );
}
