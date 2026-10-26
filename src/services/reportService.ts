import { supabase } from '../lib/supabaseClient'

export async function submitReport(input: {
  targetType: 'listing' | 'user' | 'message'
  targetId: string
  reason: string
  details?: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Please log in to report.')

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type: input.targetType,
    listing_id: input.targetType === 'listing' ? input.targetId : null,
    reported_user_id: input.targetType === 'user' ? input.targetId : null,
    message_id: input.targetType === 'message' ? input.targetId : null,
    reason: input.reason,
    details: input.details?.trim() || null,
  })
  if (error?.code === '23505') throw new Error('You already have an open report for this.')
  if (error?.code === '42501')
    throw new Error("You can't report this. Verify your email first, and you can't report your own listing.")
  if (error) throw new Error('Could not send your report. Please try again.')
}