import axios from 'axios';
import { useQuery } from 'react-query';

const getPlanDefinitions = async () => {
  const { data } = await axios.get('/fhir/PlanDefinition', { withCredentials: true });
  return data;
};

export default function usePlanDefinitions() {
  return useQuery('plan-definitions', getPlanDefinitions, { retry: false });
}
