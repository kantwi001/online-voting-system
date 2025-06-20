import { useEffect, useState } from 'react';
import axios from 'axios';

export function useUserCount(username, isAdmin) {
  const [userCount, setUserCount] = useState(null);
  useEffect(() => {
    if (!isAdmin || !username) return;
    axios.get(`http://localhost:5001/user_count?username=${encodeURIComponent(username)}`)
      .then(res => setUserCount(res.data.count))
      .catch(() => setUserCount(null));
  }, [username, isAdmin]);
  return userCount;
}
