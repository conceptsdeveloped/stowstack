/**
 * Novu — Open source notification infrastructure
 * Free tier: 30K events/mo (email, SMS, push, in-app)
 * https://novu.co
 *
 * Client-side: triggers notifications via Novu's REST API.
 * For full power, use the @novu/node SDK in your API routes.
 */

let initialized = false
let apiKey = ''
let baseUrl = ''

export function initNovu() {
  apiKey = import.meta.env.VITE_NOVU_API_KEY || ''
  baseUrl = import.meta.env.VITE_NOVU_API_URL || 'https://api.novu.co/v1'

  if (!apiKey) return
  initialized = true
}

interface TriggerPayload {
  subscriberId: string
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  payload: Record<string, unknown>
}

async function triggerWorkflow(workflowId: string, data: TriggerPayload): Promise<boolean> {
  if (!initialized) return false

  try {
    const res = await fetch(`${baseUrl}/events/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${apiKey}`,
      },
      body: JSON.stringify({
        name: workflowId,
        to: {
          subscriberId: data.subscriberId,
          email: data.email,
          phone: data.phone,
          firstName: data.firstName,
          lastName: data.lastName,
        },
        payload: data.payload,
      }),
    })
    return res.ok
  } catch {
    console.warn(`[Novu] Failed to trigger workflow "${workflowId}"`)
    return false
  }
}

// ── Pre-built Notification Workflows ──

/** Welcome email + SMS after audit form submission */
export function notifyNewLead(lead: {
  email: string
  phone?: string
  name: string
  facilityName: string
}) {
  return triggerWorkflow('new-lead-welcome', {
    subscriberId: lead.email,
    email: lead.email,
    phone: lead.phone,
    firstName: lead.name.split(' ')[0],
    payload: {
      facilityName: lead.facilityName,
      fullName: lead.name,
    },
  })
}

/** Reservation confirmation (email + SMS) */
export function notifyReservation(data: {
  email: string
  phone?: string
  name: string
  unitType: string
  facilityName: string
  moveInDate: string
}) {
  return triggerWorkflow('reservation-confirmed', {
    subscriberId: data.email,
    email: data.email,
    phone: data.phone,
    firstName: data.name.split(' ')[0],
    payload: {
      unitType: data.unitType,
      facilityName: data.facilityName,
      moveInDate: data.moveInDate,
    },
  })
}

/** Campaign alert to operator (budget, performance threshold) */
export function notifyOperator(data: {
  operatorEmail: string
  alertType: string
  metric: string
  value: number
  facilityName: string
}) {
  return triggerWorkflow('operator-alert', {
    subscriberId: data.operatorEmail,
    email: data.operatorEmail,
    payload: {
      alertType: data.alertType,
      metric: data.metric,
      value: data.value,
      facilityName: data.facilityName,
    },
  })
}

/** Recovery/win-back notification */
export function notifyRecovery(data: {
  email: string
  name: string
  facilityName: string
  offerText?: string
}) {
  return triggerWorkflow('lead-recovery', {
    subscriberId: data.email,
    email: data.email,
    firstName: data.name.split(' ')[0],
    payload: {
      facilityName: data.facilityName,
      offerText: data.offerText || 'Your unit is still available!',
    },
  })
}

export function isNovuEnabled(): boolean {
  return initialized
}
