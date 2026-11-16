import { Agentation } from 'agentation'

/**
 * Development-only visual feedback toolbar.
 *
 * Click any element in the running app to attach a note; the annotation is picked up by the
 * `agentation` MCP server and can be read with `agentation_get_all_pending`.
 *
 * This module is imported lazily and only in dev, so it never reaches the production bundle.
 */
export function DevFeedback() {
  return (
    <Agentation
      endpoint="http://localhost:4747"
      appName="Coaching Manager"
      useHashLocation
    />
  )
}

export default DevFeedback
