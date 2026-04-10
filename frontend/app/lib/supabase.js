import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yczitflesoiyxjfxrxvw.supabase.co'
const supabaseKey = 'sb_publishable_gqSznqM7wsAR4Q_07_fBXw_ZTOwDhZc'

export const supabase = createClient(supabaseUrl, supabaseKey)