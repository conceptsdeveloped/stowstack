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

export function useDiagnostic() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const processFile = useCallback(async (file) => {
    dispatch({ type: 'PARSE_START' })

    try {
      const { data, meta } = await parseCSV(file)
      dispatch({ type: 'PARSE_SUCCESS', data, meta })

      // Start analysis
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

        // Response is streamed JSON text from Claude
        const text = await response.text()
        const trimmed = text
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim()

        if (!trimmed) {
          throw new Error('Analysis failed — empty response')
        }

        // Find the JSON object in the response
        const jsonStart = trimmed.indexOf('{')
        if (jsonStart === -1) {
          throw new Error('Analysis failed — no data returned')
        }

        const result = JSON.parse(trimmed.slice(jsonStart))

        if (result.error) {
          throw new Error(result.error)
        }

        if (!result.overall_score || !result.categories) {
          throw new Error('Analysis failed — incomplete response')
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
