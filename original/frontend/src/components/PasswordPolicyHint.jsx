import React, { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import apiClient from '../api/client';

export default function PasswordPolicyHint() {
  const [policy, setPolicy] = useState(null);

  useEffect(() => {
    let active = true;
    apiClient.get('/auth/policy')
      .then(res => { if (active) setPolicy(res.data); })
      .catch(() => { if (active) setPolicy(null); });
    return () => { active = false; };
  }, []);

  if (!policy) return null;

  const items = [];
  items.push(`At least ${policy.minLength} characters`);
  if (policy.requireUppercase) items.push('At least one uppercase letter (A-Z)');
  if (policy.requireLowercase) items.push('At least one lowercase letter (a-z)');
  if (policy.requireDigit) items.push('At least one digit (0-9)');
  if (policy.requireSpecial) items.push('At least one special character');
  if (policy.blockCommonPasswords) items.push('Must not be a common/known password');
  if (policy.history && policy.history.enabled) {
    items.push(`Cannot reuse the last ${policy.history.previousCount} passwords`);
  }

  return (
    <Box sx={{ mt: 1, p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        Password requirements
      </Typography>
      <List dense disablePadding>
        {items.map((text, idx) => (
          <ListItem key={idx} sx={{ py: 0 }}>
            <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={`• ${text}`} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
