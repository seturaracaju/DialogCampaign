
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// IMPORTANT: Replace with your actual Supabase URL and Anon Key.
// You can get these from your Supabase project settings > API.
// FIX: Explicitly typed as string to resolve literal type comparison error.
const supabaseUrl: string = 'https://fbysbmyluvvrszwriszm.supabase.co';
// FIX: Explicitly typed as string to resolve literal type comparison error.
const supabaseAnonKey: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZieXNibXlsdXZ2cnN6d3Jpc3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMTAwOTQsImV4cCI6MjA3NzY4NjA5NH0.uJn1T6CkKvljMEMDgJcFSDkbKe6PVVDFU0EcPVGfMic';

let supabaseSingleton: SupabaseClient | null = null;

try {
    // --- The Definitive Cache Fix ---
    // This custom fetch function intercepts every request sent by the Supabase client.
    // It adds cache-control headers to every single request, forcing the browser and any
    // intermediate layers to always fetch the latest version of the data from the server.
    // This is the most aggressive way to prevent stale schema cache issues.
    const customFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const headers = new Headers(init?.headers);
        headers.set('Cache-Control', 'no-cache');
        headers.set('Pragma', 'no-cache');
        
        return fetch(input, { ...init, headers });
    };
    
    // Initialize the Supabase client with our custom fetch implementation
    supabaseSingleton = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            fetch: customFetch,
        },
    });

} catch (error) {
    console.error("Failed to initialize Supabase client:", error);
}


export const supabase = supabaseSingleton;
