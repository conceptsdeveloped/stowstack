import { query } from './_db.js'
import twilio from 'twilio'

const { VoiceResponse } = twilio.twiml

/**
 * Public webhook — called by Twilio when a tracking number is dialed.
 * No admin auth required (Twilio signs requests).
 */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { event } = req.query

  // Status callback — update call duration and final status
  if (event === 'status') {
    const { CallSid, CallDuration, CallStatus } = req.body || {}
    if (CallSid) {
      await query(
        `UPDATE call_logs SET status = $1, duration = $2, ended_at = NOW() WHERE twilio_call_sid = $3`,
        [CallStatus || 'completed', parseInt(CallDuration) || 0, CallSid]
      )
      // Update aggregate stats on the tracking number
      await query(
        `UPDATE call_tracking_numbers SET
           call_count = (SELECT COUNT(*) FROM call_logs WHERE tracking_number_id = call_tracking_numbers.id AND status = 'completed'),
           total_duration = (SELECT COALESCE(SUM(duration), 0) FROM call_logs WHERE tracking_number_id = call_tracking_numbers.id AND status = 'completed')
         WHERE id = (SELECT tracking_number_id FROM call_logs WHERE twilio_call_sid = $1)`,
        [CallSid]
      )
    }
    return res.status(200).end()
  }

  // Initial voice webhook — forward the call
  const { CallSid, To, From, FromCity, FromState } = req.body || {}
  if (!To) {
    const twiml = new VoiceResponse()
    twiml.say('Sorry, this number is not configured.')
    res.setHeader('Content-Type', 'text/xml')
    return res.status(200).send(twiml.toString())
  }

  // Look up the tracking number
  const rows = await query(
    `SELECT id, facility_id, forward_to FROM call_tracking_numbers WHERE phone_number = $1 AND status = 'active'`,
    [To]
  )

  if (!rows.length) {
    const twiml = new VoiceResponse()
    twiml.say('Sorry, this number is no longer in service.')
    res.setHeader('Content-Type', 'text/xml')
    return res.status(200).send(twiml.toString())
  }

  const trackingNum = rows[0]

  // Log the call
  try {
    await query(
      `INSERT INTO call_logs (tracking_number_id, facility_id, twilio_call_sid, caller_number, caller_city, caller_state, status, started_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'ringing', NOW())
       ON CONFLICT (twilio_call_sid) DO NOTHING`,
      [trackingNum.id, trackingNum.facility_id, CallSid, From, FromCity || null, FromState || null]
    )
  } catch (err) {
    console.error('Failed to log call:', err.message)
  }

  // Generate TwiML to forward the call
  const twiml = new VoiceResponse()
  twiml.dial({ callerId: To }, trackingNum.forward_to)

  res.setHeader('Content-Type', 'text/xml')
  return res.status(200).send(twiml.toString())
}
