// Terminology map keyed by org_type ("clinic" | "hospital").
// Add new keys here as the UI grows — never hardcode "Clinic"/"Hospital" in components.
export const ORG_LABELS = {
  clinic: {
    org:       'Clinic',
    orgs:      'Clinics',
    Org:       'Clinic',
    admin:     'Clinic Admin',
    manager:   'Clinic Manager',
    ward:      'Room',
    wards:     'Rooms',
    admission: 'Visit',
    inpatient: 'In-Clinic',
  },
  hospital: {
    org:       'Hospital',
    orgs:      'Hospitals',
    Org:       'Hospital',
    admin:     'Hospital Admin',
    manager:   'Hospital Manager',
    ward:      'Ward',
    wards:     'Wards',
    admission: 'Admission',
    inpatient: 'Inpatient',
  },
}

/** Returns the label set for the given org_type. Defaults to clinic. */
export function getOrgLabels(orgType) {
  return ORG_LABELS[orgType] ?? ORG_LABELS.clinic
}
