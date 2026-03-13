import { useReducer, useCallback } from 'react'
import { parseCSV, formatForClaude } from '../lib/csvParser'

const initialState = {
  phase: 'upload', // upload | parsing | analyzing | ready | error
  csvData: null,
  csvMeta: null,
  auditResult: null,
  error: null,
  darkMode: true,
  analysisProgress: 0,
}

function reducer(state, action) {
  switch (action.type) {
    case 'PARSE_START':
      return { ...state, phase: 'parsing', error: null }
    case 'PARSE_SUCCESS':
      return { ...state, phase: 'analyzing', csvData: action.data, csvMeta: action.meta }
    case 'PARSE_ERROR':
      return { ...state, phase: 'error', error: action.error }
    case 'ANALYZE_PROGRESS':
      return { ...state, analysisProgress: action.progress }
    case 'ANALYZE_SUCCESS':
      return { ...state, phase: 'ready', auditResult: action.result, analysisProgress: 100 }
    case 'ANALYZE_ERROR':
      return { ...state, phase: 'error', error: action.error }
    case 'TOGGLE_DARK_MODE':
      return { ...state, darkMode: !state.darkMode }
    case 'RESET':
      return { ...initialState, darkMode: state.darkMode }
    default:
      return state
  }
}

/**
 * Attempt to repair truncated JSON by:
 * 1. Removing trailing incomplete strings/values
 * 2. Tracking open braces/brackets and closing them in correct order
 */
function repairJSON(str) {
  let s = str

  // Remove trailing incomplete key-value pairs
  // e.g. `, "some_key": "unterminated` or `, "some_key"`
  s = s.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}[\]]*$/, '')

  // If we end mid-string, close it
  // Count unescaped quotes to see if we're inside a string
  let inString = false
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\') { i++; continue }
    if (s[i] === '"') inString = !inString
  }
  if (inString) s += '"'

  // Track open/close stack properly
  const stack = []
  let inStr = false
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\') { i++; continue }
    if (s[i] === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (s[i] === '{') stack.push('}')
    else if (s[i] === '[') stack.push(']')
    else if (s[i] === '}' || s[i] === ']') stack.pop()
  }

  // Remove any trailing comma before we close
  s = s.replace(/,\s*$/, '')

  // Close everything in reverse order
  while (stack.length > 0) {
    s += stack.pop()
  }

  return s
}

export function useDiagnostic() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const processFile = useCallback(async (file) => {
    dispatch({ type: 'PARSE_START' })

    try {
      const { data, meta } = await parseCSV(file)
      dispatch({ type: 'PARSE_SUCCESS', data, meta })

      // Start progress animation
      const progressInterval = setInterval(() => {
        dispatch({
          type: 'ANALYZE_PROGRESS',
          progress: prev => Math.min(prev + Math.random() * 8, 90)
        })
      }, 2000)

      try {
        const formattedData = formatForClaude(data)
        const response = await fetch('/api/diagnostic-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            facilityName: meta.facilityName,
            formData: formattedData,
            rawData: data,
          }),
        })

        clearInterval(progressInterval)

        const text = await response.text()
        const trimmed = text
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim()

        if (!trimmed) {
          throw new Error('Analysis failed — empty response. Please try again.')
        }

        // Find the JSON object start
        const jsonStart = trimmed.indexOf('{')
        if (jsonStart === -1) {
          throw new Error('Analysis failed — no data returned. Please try again.')
        }

        let jsonStr = trimmed.slice(jsonStart)
        let result

        // First try parsing as-is
        try {
          result = JSON.parse(jsonStr)
        } catch (parseErr) {
          // Attempt repair
          console.warn('JSON parse failed, attempting repair:', parseErr.message)
          try {
            const repaired = repairJSON(jsonStr)
            result = JSON.parse(repaired)
            console.log('JSON repair successful')
          } catch (repairErr) {
            console.error('JSON repair failed:', repairErr.message)
            console.error('Raw response length:', jsonStr.length)
            throw new Error('Analysis response was incomplete. Please try again.')
          }
        }

        if (result.error) {
          throw new Error(result.error)
        }

        // Accept partial results — UI components handle missing fields gracefully
        if (!result.overall_score && !result.categories) {
          throw new Error('Analysis failed — response missing critical data. Please try again.')
        }

        dispatch({ type: 'ANALYZE_SUCCESS', result })
      } catch (err) {
        clearInterval(progressInterval)
        dispatch({ type: 'ANALYZE_ERROR', error: err.message })
      }
    } catch (err) {
      dispatch({ type: 'PARSE_ERROR', error: err.message })
    }
  }, [])

  const toggleDarkMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_DARK_MODE' })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  return { state, processFile, toggleDarkMode, reset }
}
