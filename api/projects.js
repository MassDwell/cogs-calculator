import { createClient } from '@supabase/supabase-js';

// Environment variables with fallbacks
const supabaseUrl = process.env.SUPABASE_URL || 'https://cwnvvdxwwvrfxoudcaag.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bnZ2ZHh3d3ZyZnhvdWRjYWFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY4OTMzOTcsImV4cCI6MjAyMjQ2OTM5N30.sb_publishable_KgXR0y-99KEHPy0MaPoB6A_Nf4eCSDd';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('cogs_projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const project = req.body;
      const { data, error } = await supabase
        .from('cogs_projects')
        .insert([{
          name: project.name,
          model: project.model,
          costs: project.costs,
          list_price: project.listPrice,
          include_deck: project.includeDeck,
          total_cogs: project.totalCogs,
          margin: project.margin,
          status: project.status || 'estimated'
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Map response back to frontend format
      const mapped = {
        id: data.id,
        name: data.name,
        model: data.model,
        costs: data.costs,
        listPrice: data.list_price,
        includeDeck: data.include_deck,
        totalCogs: data.total_cogs,
        margin: data.margin,
        status: data.status,
        savedAt: data.created_at
      };
      
      return res.status(200).json(mapped);
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const project = req.body;
      const { data, error } = await supabase
        .from('cogs_projects')
        .update({
          name: project.name,
          model: project.model,
          costs: project.costs,
          list_price: project.listPrice,
          include_deck: project.includeDeck,
          total_cogs: project.totalCogs,
          margin: project.margin,
          status: project.status || 'estimated',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Map response back to frontend format
      const mapped = {
        id: data.id,
        name: data.name,
        model: data.model,
        costs: data.costs,
        listPrice: data.list_price,
        includeDeck: data.include_deck,
        totalCogs: data.total_cogs,
        margin: data.margin,
        status: data.status,
        savedAt: data.created_at
      };
      
      return res.status(200).json(mapped);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      const { error } = await supabase
        .from('cogs_projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}