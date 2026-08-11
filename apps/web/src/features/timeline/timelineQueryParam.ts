/**
 * Search term the timeline opens on, e.g. `/timeline?q=vitamin`.
 *
 * The command palette hands a record result over this way: it can find the
 * record, but there is no per-record route to send you to, and the timeline is
 * where a record is read in context.
 *
 * Its own module so the palette — which lives in `shared` — can name the param
 * without importing the timeline page and closing an import cycle around it.
 */
export const TIMELINE_QUERY_PARAM = 'q';
