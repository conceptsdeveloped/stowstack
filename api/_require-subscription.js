import { requireSession } from './_session-auth.js'

/**
 * Require an active (or trialing) subscription before processing the request.
 * Past-due subscriptions get a 7-day grace period before being blocked.
 * Returns the session on success, or null (after sending an error response).
 *
 * Usage:
 *   const session = await requireActiveSubscription(req, res)
 *   if (!session) return
 */
export async function requireActiveSubscription(req, res) {
  const session = await requireSession(req, res)
  if (!session) return null

  // Superadmins bypass subscription checks
  if (session.user.is_superadmin) return session

  const { subscriptionStatus } = session.organization

  // Active and trialing are always allowed
  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
    return session
  }

  // Past-due gets a grace period — allow read-only operations
  if (subscriptionStatus === 'past_due') {
    // Allow GET requests during grace period
    if (req.method === 'GET') return session

    return res.status(402).json({
      error: 'Payment past due',
      code: 'PAYMENT_PAST_DUE',
      message: 'Your payment is past due. Please update your payment method to continue making changes.',
    }), null
  }

  // Canceled, incomplete, or any other status — block entirely
  return res.status(403).json({
    error: 'Subscription required',
    code: 'SUBSCRIPTION_INACTIVE',
    message: 'Your subscription is inactive. Please resubscribe to access this feature.',
    subscriptionStatus,
  }), null
}

/**
 * Require a specific plan tier (or higher) for a feature.
 * Plan hierarchy: launch < growth < portfolio
 *
 * Usage:
 *   const session = await requirePlan(req, res, 'growth')  // growth or portfolio
 *   if (!session) return
 */
export async function requirePlan(req, res, minimumPlan) {
  const session = await requireActiveSubscription(req, res)
  if (!session) return null

  // Superadmins bypass plan checks
  if (session.user.is_superadmin) return session

  const planRank = { launch: 1, growth: 2, portfolio: 3 }
  const currentRank = planRank[session.organization.plan] || 0
  const requiredRank = planRank[minimumPlan] || 0

  if (currentRank < requiredRank) {
    const planNames = { launch: 'Launch', growth: 'Growth', portfolio: 'Portfolio' }
    res.status(403).json({
      error: 'Plan upgrade required',
      code: 'PLAN_UPGRADE_REQUIRED',
      message: `This feature requires the ${planNames[minimumPlan]} plan or higher.`,
      currentPlan: session.organization.plan,
      requiredPlan: minimumPlan,
    })
    return null
  }

  return session
}
