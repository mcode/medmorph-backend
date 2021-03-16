import axios from 'axios';
import { useQuery } from 'react-query';

const getAuthorizedUser = async () => {
  const { data } = await axios.get('/auth/active', { withCredentials: true });
  return data;
};

export default function useAuthorizedUser() {
  return useQuery('authorized-user', getAuthorizedUser, { retry: false });
}
