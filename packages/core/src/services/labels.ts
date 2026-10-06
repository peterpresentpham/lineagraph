// The language of the labels (relation types, registries, office names...) the API returns. The
// whole interface is Vietnamese today; this is the one place to change when labels are stored in
// more languages, instead of a literal 'vi' in every query.
export const LABEL_LANGUAGE = process.env.LABEL_LANGUAGE ?? "vi";
