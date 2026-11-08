// Pegá estos valores en Project Settings > API de tu proyecto Supabase.
const SUPABASE_URL = "https://nnejaympeaalpvmyqfbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uZWpheW1wZWFhbHB2bXlxZmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNjcwODgsImV4cCI6MjEwOTY0MzA4OH0.vNVrwxcwseghk_BCHc1Y9Vif-IkWlFMvmu9QA-5ZrU0";

window.db = SUPABASE_URL.startsWith("http") && !SUPABASE_ANON_KEY.startsWith("PEGAR_")
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
