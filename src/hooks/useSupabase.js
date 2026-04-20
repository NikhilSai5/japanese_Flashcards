import { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';

export function useSupabase() {
  const [client] = useState(() => supabase);

  return client;
}
