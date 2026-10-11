/**
 * Standard Indian GST State Master List & Mapping Utilities
 * Maps 2-digit GST state codes to official state names and vice-versa.
 */

export const GST_STATES = [
    { code: '01', name: 'Jammu and Kashmir' },
    { code: '02', name: 'Himachal Pradesh' },
    { code: '03', name: 'Punjab' },
    { code: '04', name: 'Chandigarh' },
    { code: '05', name: 'Uttarakhand' },
    { code: '06', name: 'Haryana' },
    { code: '07', name: 'Delhi' },
    { code: '08', name: 'Rajasthan' },
    { code: '09', name: 'Uttar Pradesh' },
    { code: '10', name: 'Bihar' },
    { code: '11', name: 'Sikkim' },
    { code: '12', name: 'Arunachal Pradesh' },
    { code: '13', name: 'Nagaland' },
    { code: '14', name: 'Manipur' },
    { code: '15', name: 'Mizoram' },
    { code: '16', name: 'Tripura' },
    { code: '17', name: 'Meghalaya' },
    { code: '18', name: 'Assam' },
    { code: '19', name: 'West Bengal' },
    { code: '20', name: 'Jharkhand' },
    { code: '21', name: 'Odisha' },
    { code: '22', name: 'Chhattisgarh' },
    { code: '23', name: 'Madhya Pradesh' },
    { code: '24', name: 'Gujarat' },
    { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
    { code: '27', name: 'Maharashtra' },
    { code: '28', name: 'Andhra Pradesh (Old)' },
    { code: '29', name: 'Karnataka' },
    { code: '30', name: 'Goa' },
    { code: '31', name: 'Lakshadweep' },
    { code: '32', name: 'Kerala' },
    { code: '33', name: 'Tamil Nadu' },
    { code: '34', name: 'Puducherry' },
    { code: '35', name: 'Andaman and Nicobar Islands' },
    { code: '36', name: 'Telangana' },
    { code: '37', name: 'Andhra Pradesh' },
    { code: '38', name: 'Ladakh' },
    { code: '97', name: 'Other Territory' },
    { code: '99', name: 'Centre Jurisdiction' }
];

export const GST_STATE_MAP = GST_STATES.reduce((acc, curr) => {
    acc[curr.code] = curr.name;
    return acc;
}, {});

/**
 * Normalizes and formats state for display as: "CODE - State Name" (e.g. "07 - Delhi")
 * @param {string} stateInput - Could be a state code ("07"), state name ("Delhi"), or pre-formatted string ("07 - Delhi")
 * @param {string} [gstin] - Optional GSTIN whose first 2 digits represent the state code
 * @returns {string} Formatted "CODE - State Name", or original input if unmappable, or empty string.
 */
export const formatStateDisplay = (stateInput, gstin) => {
    const rawState = (stateInput || '').trim();
    const rawGstin = (gstin || '').trim().toUpperCase();

    // 1. If already formatted as "XX - State Name"
    const formattedMatch = rawState.match(/^([0-9]{2})\s*-\s*(.+)$/i);
    if (formattedMatch) {
        const code = formattedMatch[1];
        const knownName = GST_STATE_MAP[code];
        return knownName ? `${code} - ${knownName}` : rawState;
    }

    // 2. If stateInput is a 2-digit code
    if (/^[0-9]{2}$/.test(rawState)) {
        const name = GST_STATE_MAP[rawState];
        if (name) return `${rawState} - ${name}`;
    }

    // 3. If stateInput is a state name
    if (rawState) {
        const lowerName = rawState.toLowerCase();
        const matched = GST_STATES.find(s => 
            s.name.toLowerCase() === lowerName || 
            lowerName.includes(s.name.toLowerCase()) || 
            s.name.toLowerCase().includes(lowerName)
        );
        if (matched) {
            return `${matched.code} - ${matched.name}`;
        }
    }

    // 4. Try extracting from GSTIN first 2 digits if available
    if (rawGstin && rawGstin.length >= 2) {
        const codeFromGstin = rawGstin.substring(0, 2);
        if (/^[0-9]{2}$/.test(codeFromGstin)) {
            const name = GST_STATE_MAP[codeFromGstin];
            if (name) {
                return `${codeFromGstin} - ${name}`;
            }
        }
    }

    // 5. Fallback: return raw state without fabricating if it cannot be mapped
    return rawState;
};

/**
 * Extracts the 2-digit GST state code suitable for backend API payload.
 * e.g. "07 - Delhi" -> "07", "07" -> "07"
 * @param {string} displayOrCode 
 * @returns {string} 2-digit state code or trimmed value
 */
export const extractStateCode = (displayOrCode) => {
    if (!displayOrCode) return '';
    const trimmed = displayOrCode.trim();

    // Check if starts with 2 digits
    const codeMatch = trimmed.match(/^([0-9]{2})/);
    if (codeMatch && GST_STATE_MAP[codeMatch[1]]) {
        return codeMatch[1];
    }

    // Check if it's a name
    const lower = trimmed.toLowerCase();
    const matched = GST_STATES.find(s => s.name.toLowerCase() === lower);
    if (matched) {
        return matched.code;
    }

    return trimmed;
};

/**
 * Filters the list of states given a search query (code or name)
 * @param {string} query 
 * @returns {Array} List of matching states
 */
export const searchGstStates = (query) => {
    if (!query || !query.trim()) return GST_STATES;
    const q = query.trim().toLowerCase();
    return GST_STATES.filter(s => 
        s.code.includes(q) || 
        s.name.toLowerCase().includes(q) ||
        `${s.code} - ${s.name}`.toLowerCase().includes(q)
    );
};
