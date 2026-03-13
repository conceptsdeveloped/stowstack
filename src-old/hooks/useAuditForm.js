import { useState } from 'react'

const initialFields = {
  name: '',
  email: '',
  phone: '',
  facilityName: '',
  location: '',
  occupancyRange: '',
  totalUnits: '',
  biggestIssue: '',
  notes: '',
}

function validate(fields) {
  const errors = {}

  if (!fields.name.trim()) errors.name = 'Name is required'
  if (!fields.email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = 'Invalid email format'
  }
  if (!fields.phone.trim()) {
    errors.phone = 'Phone is required'
  } else if (fields.phone.replace(/\D/g, '').length < 10) {
    errors.phone = 'Phone must be at least 10 digits'
  }
  if (!fields.facilityName.trim()) errors.facilityName = 'Facility name is required'
  if (!fields.location.trim()) errors.location = 'Location is required'
  if (!fields.occupancyRange) errors.occupancyRange = 'Occupancy range is required'
  if (!fields.totalUnits) errors.totalUnits = 'Total units is required'
  if (!fields.biggestIssue) errors.biggestIssue = 'Vacancy issue is required'

  return errors
}

export function useAuditForm() {
  const [fields, setFields] = useState(initialFields)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [submitError, setSubmitError] = useState('')

  function updateField(name, value) {
    setFields(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validate(fields)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setStatus('submitting')
    setSubmitError('')

    try {
      const endpoint = import.meta.env.VITE_FORM_ENDPOINT
      if (!endpoint) throw new Error('Form endpoint not configured')

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })

      const data = await res.json()
      if (!res.ok) {
        if (data.fields) {
          setErrors(data.fields)
          setStatus('idle')
          return
        }
        throw new Error(data.error || `Server error (${res.status})`)
      }
      setStatus('success')
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  function reset() {
    setFields(initialFields)
    setErrors({})
    setStatus('idle')
    setSubmitError('')
  }

  return { fields, errors, status, submitError, updateField, handleSubmit, reset }
}
