
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rannlreeqpciirxvbrwl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbm5scmVlcXBjaWlyeHZicndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE2ODI5MDcsImV4cCI6MjAzNzI1ODkwN30.kDT99XebORAhigHi1qaH5I6gFC3L6bYcIjNKZA_zCgc';
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase