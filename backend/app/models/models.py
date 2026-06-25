"""
BHarath Health v2 — SQLAlchemy models (22 tables)
"""
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime,
    Date, Time, ForeignKey, Numeric, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class PlatformAdmin(Base):
    __tablename__ = "platform_admins"
    id              = Column(Integer, primary_key=True, index=True)
    full_name       = Column(String(200), nullable=False)
    email           = Column(String(150), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active       = Column(Boolean, default=True)
    token_version   = Column(Integer, default=1)
    otp_code        = Column(String(6), nullable=True)
    otp_expiry      = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, server_default=func.now())


class IdSequence(Base):
    """Atomic counter backing all human-readable business IDs (see core/ids.py)."""
    __tablename__ = "id_sequences"
    id         = Column(Integer, primary_key=True, index=True)
    scope_type = Column(String(30), nullable=False)          # global | clinic
    scope_id   = Column(Integer, nullable=False, default=0)   # 0 for global counters
    kind       = Column(String(40), nullable=False)           # hc_id | branch_code | emp_DR | encounter | ...
    next_val   = Column(Integer, nullable=False, default=1)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        UniqueConstraint("scope_type", "scope_id", "kind", name="uq_id_sequences_scope"),
    )


class Clinic(Base):
    __tablename__ = "clinics"
    id                      = Column(Integer, primary_key=True, index=True)
    name                    = Column(String(200), nullable=False)
    slug                    = Column(String(100), unique=True, nullable=False)
    specialty               = Column(String(200))
    description             = Column(Text)
    phone                   = Column(String(20))
    email                   = Column(String(150))
    address                 = Column(Text)
    city                    = Column(String(100))
    state                   = Column(String(100))
    pincode                 = Column(String(10))
    google_maps_url         = Column(Text, nullable=True)
    logo_url                = Column(String(500), nullable=True)
    brand_name              = Column(String(200), nullable=True)  # display name shown in portals
    brand_color             = Column(String(20), nullable=True)   # hex color e.g. #0F2557
    is_active               = Column(Boolean, default=True)
    is_verified             = Column(Boolean, default=False)
    status                  = Column(String(20), default="pending")  # pending|active|suspended|revoked
    suspension_reason       = Column(String(100), nullable=True)
    suspension_comment      = Column(Text, nullable=True)
    rejection_reason        = Column(Text, nullable=True)
    license_document_url    = Column(String(500), nullable=True)
    subscription_plan       = Column(String(20), default="free")
    subscription_status     = Column(String(20), default="active")
    subscription_expires_at = Column(DateTime, nullable=True)
    subscription_expiry     = Column(DateTime, nullable=True)
    clinic_prefix           = Column(String(10), nullable=True)
    hc_id                   = Column(String(12), unique=True, nullable=True)  # Health Center ID, e.g. HC00001
    drug_license_number     = Column(String(100), nullable=True)
    gstin                   = Column(String(20), nullable=True)
    # Org type & capabilities
    org_type                = Column(String(20), default="clinic")   # clinic|hospital|pharmacy|diagnostic
    website                 = Column(String(300), nullable=True)
    operating_hours         = Column(String(200), nullable=True)
    reg_number              = Column(String(100), nullable=True)      # hospital registration number
    accreditation           = Column(String(100), nullable=True)      # NABH, JCI, ISO etc.
    # Module flags — set during registration, controls which portals are enabled
    has_pharmacy            = Column(Boolean, default=False)
    has_lab                 = Column(Boolean, default=False)
    has_imaging             = Column(Boolean, default=False)
    has_inpatient           = Column(Boolean, default=False)
    has_emergency           = Column(Boolean, default=False)
    has_blood_bank          = Column(Boolean, default=False)
    has_ambulance           = Column(Boolean, default=False)
    has_telehealth          = Column(Boolean, default=False)
    wards_enabled           = Column(Boolean, default=False)
    # Capacity
    total_beds              = Column(Integer, default=0)
    icu_beds                = Column(Integer, default=0)
    ot_count                = Column(Integer, default=0)
    # Diagnostic
    nabl_accredited         = Column(Boolean, default=False)
    nabl_number             = Column(String(100), nullable=True)
    # Association — for hospital-attached pharmacies / diagnostics
    parent_clinic_id        = Column(Integer, ForeignKey("clinics.id"), nullable=True)
    # Counters
    admission_sequence      = Column(Integer, default=0)
    patient_id_counter      = Column(Integer, default=0)
    latitude                = Column(Numeric(10, 7), nullable=True)
    longitude               = Column(Numeric(10, 7), nullable=True)
    capacity_description    = Column(Text, nullable=True)
    modules                 = Column(JSON, nullable=True)
    entitlement_overrides   = Column(JSON, nullable=True)   # per-clinic module add/remove or limit bumps
    billing_email           = Column(String(150), nullable=True)  # subscription billing contact
    created_at              = Column(DateTime, server_default=func.now())

    branches        = relationship("Branch", back_populates="clinic", cascade="all, delete-orphan")
    staff           = relationship("Staff", back_populates="clinic")
    patients        = relationship("Patient", back_populates="clinic")
    online_bookings = relationship("OnlineBooking", back_populates="clinic")


class Specialty(Base):
    __tablename__ = "specialties"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(200), unique=True, nullable=False)
    category   = Column(String(100))
    is_active  = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


class DoctorSpecialty(Base):
    __tablename__ = "doctor_specialties"
    id                = Column(Integer, primary_key=True, index=True)
    doctor_profile_id = Column(Integer, ForeignKey("doctor_profiles.id"), nullable=False)
    specialty_name    = Column(String(200), nullable=False)
    is_primary        = Column(Boolean, default=False)
    created_at        = Column(DateTime, server_default=func.now())

    __table_args__ = (UniqueConstraint("doctor_profile_id", "specialty_name"),)


class Branch(Base):
    __tablename__ = "branches"
    id          = Column(Integer, primary_key=True, index=True)
    clinic_id   = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_code = Column(String(20), nullable=True)  # e.g. HC00001-B01
    name       = Column(String(200), nullable=False)
    address    = Column(Text)
    city       = Column(String(100))
    phone      = Column(String(20))
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    clinic       = relationship("Clinic", back_populates="branches")
    staff        = relationship("Staff", back_populates="branch")
    appointments = relationship("Appointment", back_populates="branch")


class Staff(Base):
    __tablename__ = "staff"
    id              = Column(Integer, primary_key=True, index=True)
    clinic_id       = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id       = Column(Integer, ForeignKey("branches.id"), nullable=True)
    full_name       = Column(String(200), nullable=False)
    email           = Column(String(150), unique=True, nullable=True)
    mobile          = Column(String(20), unique=True, nullable=True)
    phone           = Column(String(20), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role                 = Column(String(30), nullable=False)
    is_active            = Column(Boolean, default=True)
    username             = Column(String(30), unique=True, nullable=True)
    is_first_login       = Column(Boolean, default=True)
    temp_pw_expiry       = Column(DateTime, nullable=True)
    token_version        = Column(Integer, default=1)
    failed_login_attempts = Column(Integer, default=0)
    locked_until         = Column(DateTime, nullable=True)
    last_seen_at         = Column(DateTime, nullable=True)
    license_number       = Column(String(100), nullable=True)
    license_document_url = Column(String(500), nullable=True)
    avatar_url           = Column(String(500))
    pin_hash             = Column(String(255), nullable=True)
    pin_set_at           = Column(DateTime, nullable=True)
    pin_reset_required   = Column(Boolean, default=False)
    pin_failed_attempts  = Column(Integer, default=0)
    pin_locked_until     = Column(DateTime, nullable=True)
    has_inpatient_access = Column(Boolean, default=False)
    employee_id              = Column(String(30), nullable=True)
    designation              = Column(String(100), nullable=True)
    department               = Column(String(100), nullable=True)
    ward                     = Column(String(100), nullable=True)
    reporting_manager_id     = Column(Integer, ForeignKey("staff.id"), nullable=True)
    employment_type          = Column(String(20), nullable=True)
    join_date                = Column(Date, nullable=True)
    date_of_birth            = Column(Date, nullable=True)
    gender                   = Column(String(10), nullable=True)
    emergency_contact_name   = Column(String(200), nullable=True)
    emergency_contact_mobile = Column(String(20), nullable=True)
    qualification            = Column(String(200), nullable=True)
    registration_number      = Column(String(100), nullable=True)
    license_expiry_date      = Column(Date, nullable=True)
    address                  = Column(Text, nullable=True)
    modules                  = Column(JSON, nullable=True)
    secondary_roles          = Column(JSON, nullable=True)
    scheduled_removal_date   = Column(Date, nullable=True)
    removal_reason           = Column(String(200), nullable=True)
    created_at           = Column(DateTime, server_default=func.now())
    updated_at           = Column(DateTime, server_default=func.now(), onupdate=func.now())

    clinic         = relationship("Clinic", back_populates="staff")
    branch         = relationship("Branch", back_populates="staff")
    doctor_profile = relationship("DoctorProfile", back_populates="staff", uselist=False)


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"
    id                 = Column(Integer, primary_key=True, index=True)
    staff_id           = Column(Integer, ForeignKey("staff.id"), unique=True, nullable=False)
    clinic_id          = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    specialty          = Column(String(200))
    qualification      = Column(Text)
    mci_number         = Column(String(100))
    mci_verified       = Column(Boolean, default=False)
    experience_years   = Column(Integer, default=0)
    consultation_fee   = Column(Numeric(10, 2), default=500)
    bio                = Column(Text, nullable=True)
    languages          = Column(String(500), nullable=True)
    is_active          = Column(Boolean, default=True)
    accepting_appointments = Column(Boolean, default=True)   # receptionist can block new bookings
    auto_confirm      = Column(Boolean, default=True)
    telehealth_enabled = Column(Boolean, default=False)
    telehealth_fee     = Column(Numeric(10, 2), nullable=True)
    telehealth_slots   = Column(JSON, nullable=True)
    input_mode         = Column(String(20), default='type')   # type | voice | handwriting
    created_at         = Column(DateTime, server_default=func.now())

    staff        = relationship("Staff", back_populates="doctor_profile")
    schedules    = relationship("DoctorSchedule", back_populates="doctor")
    appointments = relationship("Appointment", back_populates="doctor")


class DoctorSchedule(Base):
    __tablename__ = "doctor_schedules"
    id           = Column(Integer, primary_key=True, index=True)
    doctor_id    = Column(Integer, ForeignKey("doctor_profiles.id"), nullable=False)
    branch_id    = Column(Integer, ForeignKey("branches.id"), nullable=True)
    day_of_week  = Column(String(10), nullable=False)  # "monday", "tuesday", etc.
    start_time   = Column(String(8), nullable=False)   # "HH:MM"
    end_time     = Column(String(8), nullable=False)   # "HH:MM"
    slot_minutes             = Column(Integer, default=15)
    max_patients             = Column(Integer, default=20)
    is_active                = Column(Boolean, default=True)
    online_slots             = Column(Integer, default=0)   # 0 = no cap
    online_auto_confirm      = Column(Integer, default=0)   # first N online bookings auto-confirmed
    walk_in_slots            = Column(Integer, default=0)   # display only
    telehealth_slots         = Column(Integer, default=0)   # 0 = telehealth not configured
    telehealth_auto_confirm  = Column(Integer, default=0)

    doctor = relationship("DoctorProfile", back_populates="schedules")


class DoctorDeskAssignment(Base):
    """Pin/lock state per receptionist so multiple receptionists can split doctors."""
    __tablename__ = "doctor_desk_assignments"
    id         = Column(Integer, primary_key=True, index=True)
    clinic_id  = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    doctor_id  = Column(Integer, ForeignKey("doctor_profiles.id"), nullable=False)
    staff_id   = Column(Integer, ForeignKey("staff.id"), nullable=False)
    pinned     = Column(Boolean, default=False)
    locked     = Column(Boolean, default=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("doctor_id", "staff_id", name="uq_desk_doctor_staff"),)


class Patient(Base):
    __tablename__ = "patients"
    id                      = Column(Integer, primary_key=True, index=True)
    clinic_id               = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id               = Column(Integer, ForeignKey("branches.id"), nullable=True)
    portal_user_id          = Column(Integer, ForeignKey("patient_users.id"), nullable=True)
    clinic_patient_id       = Column(String(20), nullable=True, index=True)  # APL-00001
    uhid                    = Column(String(50), nullable=True)   # legacy only
    bh_id                   = Column(String(50), nullable=True)   # backend universal key
    full_name               = Column(String(200), nullable=False)
    date_of_birth           = Column(Date, nullable=True)
    gender                  = Column(String(10), nullable=True)
    mobile                  = Column(String(20), nullable=True)
    email                   = Column(String(150), nullable=True)
    address                 = Column(Text, nullable=True)
    city                    = Column(String(100), nullable=True)
    state                   = Column(String(100), nullable=True)
    pincode                 = Column(String(10), nullable=True)
    blood_group             = Column(String(5), nullable=True)
    allergies               = Column(Text, nullable=True)
    emergency_contact_name  = Column(String(200), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    abha_id                 = Column(String(20), nullable=True)
    abha_linked             = Column(Boolean, default=False)
    guardian_name           = Column(String(200), nullable=True)
    guardian_mobile         = Column(String(20),  nullable=True)
    guardian_relationship   = Column(String(50),  nullable=True)
    first_name              = Column(String(100), nullable=True)
    last_name               = Column(String(100), nullable=True)
    whatsapp                = Column(String(20),  nullable=True)
    marital_status          = Column(String(30),  nullable=True)
    occupation              = Column(String(150), nullable=True)
    nationality             = Column(String(100), nullable=True)
    religion                = Column(String(100), nullable=True)
    preferred_language      = Column(String(50),  nullable=True)
    insurance_type          = Column(String(30),  nullable=True)
    insurance_provider      = Column(String(150), nullable=True)
    insurance_policy_number = Column(String(100), nullable=True)
    govt_scheme_name        = Column(String(150), nullable=True)
    govt_beneficiary_id     = Column(String(100), nullable=True)
    emergency_contact_relationship = Column(String(50), nullable=True)
    is_active               = Column(Boolean, default=True)
    created_at              = Column(DateTime, server_default=func.now())
    updated_at              = Column(DateTime, server_default=func.now(), onupdate=func.now())

    clinic        = relationship("Clinic", back_populates="patients")
    portal_user   = relationship("PatientUser", back_populates="patients")
    appointments  = relationship("Appointment", back_populates="patient")
    prescriptions = relationship("Prescription", back_populates="patient")
    lab_orders    = relationship("LabOrder", foreign_keys="LabOrder.patient_id", viewonly=True)
    invoices      = relationship("Invoice", back_populates="patient")
    patient_tags  = relationship("PatientTag", back_populates="patient", cascade="all, delete-orphan")


class PatientUser(Base):
    """One row per mobile number (phone owner). Up to 5 BHProfiles per user."""
    __tablename__ = "patient_users"
    id                   = Column(Integer, primary_key=True, index=True)
    full_name            = Column(String(200), nullable=True)   # kept for legacy; prefer BHProfile names
    mobile               = Column(String(20), nullable=False, index=True)  # NOT unique — family can share
    email                = Column(String(150), unique=True, nullable=True)
    hashed_password      = Column(String(255), nullable=True)   # legacy password auth (optional)
    otp_code             = Column(String(10), nullable=True)
    otp_expiry           = Column(DateTime, nullable=True)
    otp_verified_token   = Column(String(255), nullable=True)   # short-lived token post-OTP verify
    otp_token_expiry     = Column(DateTime, nullable=True)
    disclosure_pin         = Column(String(255), nullable=True)
    disclosure_pin_expiry  = Column(DateTime, nullable=True)
    preferred_language   = Column(String(20), default="en")
    is_active            = Column(Boolean, default=True)
    is_verified          = Column(Boolean, default=False)
    created_at           = Column(DateTime, server_default=func.now())

    patients    = relationship("Patient", back_populates="portal_user")
    bh_profiles = relationship("BHProfile", back_populates="patient_user")


class BHStateGroup(Base):
    """Maps a single digit (0-9) to a group of Indian states. Seeded once, permanent."""
    __tablename__ = "bh_state_groups"
    id     = Column(Integer, primary_key=True, index=True)
    digit  = Column(Integer, unique=True, nullable=False)  # 0-9
    label  = Column(String(100), nullable=False)           # e.g. "North India"
    states = Column(JSON, nullable=False)                  # list of state name strings

    sequence = relationship("BHIDSequence", back_populates="state_group", uselist=False)


class BHIDSequence(Base):
    """Atomic counter per state-digit group for generating BH IDs."""
    __tablename__ = "bh_id_sequences"
    id       = Column(Integer, primary_key=True, index=True)
    digit    = Column(Integer, ForeignKey("bh_state_groups.digit"), unique=True, nullable=False)
    next_seq = Column(Integer, nullable=False, default=1)

    state_group = relationship("BHStateGroup", back_populates="sequence")


class BHProfile(Base):
    """One permanent health identity per person. BH ID is assigned on creation and never changes."""
    __tablename__ = "bh_profiles"
    id              = Column(Integer, primary_key=True, index=True)
    patient_user_id = Column(Integer, ForeignKey("patient_users.id"), nullable=False)
    bh_id           = Column(String(11), unique=True, nullable=False, index=True)  # BH[digit][8-digits]
    first_name      = Column(String(100), nullable=False)
    last_name       = Column(String(100), nullable=False)
    gender          = Column(String(10), nullable=True)
    date_of_birth   = Column(Date, nullable=True)
    state           = Column(String(100), nullable=True)   # state at registration (determines digit)
    state_digit     = Column(Integer, nullable=False)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, server_default=func.now())

    patient_user = relationship("PatientUser", back_populates="bh_profiles")


class Appointment(Base):
    __tablename__ = "appointments"
    id                = Column(Integer, primary_key=True, index=True)
    clinic_id         = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id         = Column(Integer, ForeignKey("branches.id"), nullable=True)
    encounter_no      = Column(String(24), nullable=True, index=True)  # unified encounter key, e.g. HC00001-ENC-000123
    patient_id        = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id         = Column(Integer, ForeignKey("doctor_profiles.id"), nullable=False)
    staff_id          = Column(Integer, ForeignKey("staff.id"), nullable=True)
    appointment_date  = Column(Date, nullable=False)
    appointment_time  = Column(String(8), nullable=False)  # "HH:MM"
    token_number      = Column(Integer, nullable=True)
    status            = Column(String(50), default="pending")
    mode              = Column(String(50), default="offline")  # offline|online|telehealth
    reason            = Column(Text, nullable=True)
    notes             = Column(Text, nullable=True)
    fee               = Column(Numeric(10, 2), nullable=True)
    online_booking_id  = Column(Integer, ForeignKey("online_bookings.id"), nullable=True)
    telehealth_joined_at = Column(DateTime, nullable=True)
    telehealth_room      = Column(String(120), nullable=True)
    triage_complaint   = Column(Text, nullable=True)
    visit_type         = Column(String(20), default="fresh")  # fresh|followup|emergency
    previsit_token     = Column(String(64), nullable=True, unique=True, index=True)
    previsit_data      = Column(JSON, nullable=True)
    previsit_submitted_at = Column(DateTime, nullable=True)
    created_at         = Column(DateTime, server_default=func.now())
    updated_at         = Column(DateTime, server_default=func.now(), onupdate=func.now())

    patient       = relationship("Patient", back_populates="appointments")
    doctor        = relationship("DoctorProfile", back_populates="appointments")
    branch        = relationship("Branch", back_populates="appointments")
    vitals        = relationship("Vitals", back_populates="appointment", uselist=False)
    soap_note     = relationship("SoapNote", back_populates="appointment", uselist=False)
    prescriptions = relationship("Prescription", back_populates="appointment")
    lab_orders    = relationship("LabOrder", foreign_keys="LabOrder.appointment_id", viewonly=True)
    invoices      = relationship("Invoice", back_populates="appointment")


class OnlineBooking(Base):
    __tablename__ = "online_bookings"
    id                = Column(Integer, primary_key=True, index=True)
    clinic_id         = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id         = Column(Integer, ForeignKey("branches.id"), nullable=True)
    doctor_id         = Column(Integer, ForeignKey("doctor_profiles.id"), nullable=True)
    patient_user_id   = Column(Integer, ForeignKey("patient_users.id"), nullable=True)
    patient_name      = Column(String(200), nullable=False)
    first_name        = Column(String(100), nullable=True)
    last_name         = Column(String(100), nullable=True)
    patient_mobile    = Column(String(20), nullable=False)
    patient_email     = Column(String(150), nullable=True)
    booking_date      = Column(Date, nullable=False)
    booking_time      = Column(String(8), nullable=False)  # "HH:MM"
    reason            = Column(Text, nullable=True)
    status            = Column(String(50), default="pending")
    confirmation_code = Column(String(20), nullable=True)
    notes             = Column(Text, nullable=True)
    mode              = Column(String(20), default="offline", nullable=True)  # offline | telehealth
    patient_state     = Column(String(100), nullable=True)
    bh_id_ref         = Column(String(20), nullable=True)   # BHProfile.bh_id of the patient
    payment_mode      = Column(String(30), default="pay_at_clinic", nullable=True)
    payment_status    = Column(String(30), default="pending", nullable=True)
    amount_due        = Column(Numeric(10, 2), nullable=True)
    created_at        = Column(DateTime, server_default=func.now())

    clinic = relationship("Clinic", back_populates="online_bookings")
    doctor = relationship("DoctorProfile")


class Vitals(Base):
    __tablename__ = "vitals"
    id                       = Column(Integer, primary_key=True, index=True)
    patient_id               = Column(Integer, ForeignKey("patients.id"), nullable=False)
    appointment_id           = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    branch_id                = Column(Integer, ForeignKey("branches.id"), nullable=True)
    blood_pressure_systolic  = Column(Integer, nullable=True)
    blood_pressure_diastolic = Column(Integer, nullable=True)
    pulse_rate               = Column(Integer, nullable=True)
    temperature              = Column(Numeric(4, 1), nullable=True)
    weight_kg                = Column(Numeric(5, 2), nullable=True)
    height_cm                = Column(Numeric(5, 2), nullable=True)
    oxygen_saturation        = Column(Integer, nullable=True)
    blood_sugar              = Column(Numeric(6, 2), nullable=True)
    recorded_at              = Column(DateTime, server_default=func.now())

    appointment = relationship("Appointment", back_populates="vitals")


class SoapNote(Base):
    __tablename__ = "soap_notes"
    id              = Column(Integer, primary_key=True, index=True)
    appointment_id  = Column(Integer, ForeignKey("appointments.id"), nullable=False)
    branch_id       = Column(Integer, ForeignKey("branches.id"), nullable=True)
    subjective      = Column(Text, nullable=True)
    objective       = Column(Text, nullable=True)
    assessment      = Column(Text, nullable=True)
    plan            = Column(Text, nullable=True)
    diagnosis_codes = Column(JSON, nullable=True)
    follow_up_days  = Column(Integer, nullable=True)
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # 7-field clinical encounter format
    reason_for_visit        = Column(Text, nullable=True)
    patient_complaints      = Column(Text, nullable=True)
    past_history            = Column(Text, nullable=True)
    investigations_findings = Column(Text, nullable=True)
    medications_prescribed  = Column(Text, nullable=True)
    discharge_assessment    = Column(Text, nullable=True)
    cautions_followup       = Column(Text, nullable=True)
    is_locked               = Column(Boolean, default=False)
    locked_at               = Column(DateTime, nullable=True)
    created_by              = Column(Integer, ForeignKey("staff.id"), nullable=True)

    appointment = relationship("Appointment", back_populates="soap_note")


class FollowUpReminder(Base):
    __tablename__ = "follow_up_reminders"
    id                      = Column(Integer, primary_key=True, index=True)
    appointment_id          = Column(Integer, ForeignKey("appointments.id"), nullable=False)
    clinic_id               = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    patient_name            = Column(String(200), nullable=False)
    patient_mobile          = Column(String(20), nullable=True)
    doctor_name             = Column(String(200), nullable=True)
    due_date                = Column(Date, nullable=False)
    follow_up_days          = Column(Integer, nullable=False)
    notes                   = Column(Text, nullable=True)
    status                  = Column(String(20), default="pending")  # pending/called/scheduled/dismissed
    called_by               = Column(Integer, ForeignKey("staff.id"), nullable=True)
    called_at               = Column(DateTime, nullable=True)
    scheduled_appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    created_at              = Column(DateTime, server_default=func.now())


class ClinicPatientTag(Base):
    __tablename__ = "clinic_patient_tags"
    id          = Column(Integer, primary_key=True, index=True)
    clinic_id   = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    tag_name    = Column(String(100), nullable=False)
    icd10_code  = Column(String(20), nullable=True)
    specialty   = Column(String(100), nullable=True)
    usage_count = Column(Integer, default=0)
    created_by  = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_at  = Column(DateTime, server_default=func.now())

    patient_tags = relationship("PatientTag", back_populates="saved_tag")


class PatientTag(Base):
    __tablename__ = "patient_tags"
    id           = Column(Integer, primary_key=True, index=True)
    patient_id   = Column(Integer, ForeignKey("patients.id"), nullable=False)
    clinic_id    = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    tag_name     = Column(String(100), nullable=False)
    icd10_code   = Column(String(20), nullable=True)
    saved_tag_id = Column(Integer, ForeignKey("clinic_patient_tags.id"), nullable=True)
    assigned_by  = Column(Integer, ForeignKey("staff.id"), nullable=True)
    assigned_at  = Column(DateTime, server_default=func.now())

    patient   = relationship("Patient", back_populates="patient_tags")
    saved_tag = relationship("ClinicPatientTag", back_populates="patient_tags")


class EncounterAccessLog(Base):
    __tablename__ = "encounter_access_logs"
    id                  = Column(Integer, primary_key=True, index=True)
    patient_id          = Column(Integer, ForeignKey("patients.id"), nullable=False)
    accessed_by         = Column(Integer, ForeignKey("staff.id"), nullable=False)
    accessing_clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id           = Column(Integer, ForeignKey("branches.id"), nullable=True)
    session_expires_at  = Column(DateTime, nullable=True)
    accessed_at         = Column(DateTime, server_default=func.now())


class BarcodeMaster(Base):
    """Shared cross-clinic barcode → medicine mapping. Self-learning as pharmacists scan."""
    __tablename__ = "barcode_master"
    id           = Column(Integer, primary_key=True, index=True)
    barcode      = Column(String(100), nullable=False, unique=True, index=True)
    medicine_id  = Column(Integer, ForeignKey("medicines.id"), nullable=True)
    # Snapshot of drug details at time of mapping (survives medicine record changes)
    drug_name    = Column(String(200), nullable=False)
    generic_name = Column(String(200), nullable=True)
    manufacturer = Column(String(200), nullable=True)
    form         = Column(String(50), nullable=True)   # tablet/capsule/syrup/injection/etc
    strength     = Column(String(50), nullable=True)   # e.g. 500mg, 10mg/5ml
    pack_size    = Column(String(50), nullable=True)   # e.g. 10 tablets, 100ml
    mrp          = Column(Numeric(10, 2), nullable=True)
    hsn_code     = Column(String(20), nullable=True)
    gst_rate     = Column(Numeric(5, 2), nullable=True)
    scan_count   = Column(Integer, default=1)          # how many times scanned across all clinics
    added_by     = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_at   = Column(DateTime, server_default=func.now())
    updated_at   = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Medicine(Base):
    __tablename__ = "medicines"
    id             = Column(Integer, primary_key=True, index=True)
    branch_id      = Column(Integer, ForeignKey("branches.id"), nullable=True)
    name           = Column(String(200), nullable=False)
    generic_name   = Column(String(200), nullable=True)
    category       = Column(String(100), nullable=True)
    form           = Column(String(50), nullable=True)
    strength       = Column(String(50), nullable=True)
    manufacturer   = Column(String(200), nullable=True)
    unit_price     = Column(Numeric(10, 2), nullable=True)
    mrp            = Column(Numeric(10, 2), nullable=True)
    stock_quantity = Column(Integer, default=0)
    reorder_level  = Column(Integer, default=10)
    expiry_date    = Column(Date, nullable=True)
    batch_number   = Column(String(50), nullable=True)
    hsn_code       = Column(String(20), nullable=True)
    schedule       = Column(String(10), nullable=True)
    gst_rate       = Column(Numeric(5, 2), nullable=True)
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime, server_default=func.now())

    prescription_items = relationship("PrescriptionItem", back_populates="medicine")


class Prescription(Base):
    __tablename__ = "prescriptions"
    id             = Column(Integer, primary_key=True, index=True)
    clinic_id      = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    patient_id     = Column(Integer, ForeignKey("patients.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    branch_id      = Column(Integer, ForeignKey("branches.id"), nullable=True)
    prescribed_by  = Column(Integer, ForeignKey("staff.id"), nullable=True)
    status         = Column(String(50), default="pending")
    notes          = Column(Text, nullable=True)
    created_at     = Column(DateTime, server_default=func.now())
    dispensed_at   = Column(DateTime, nullable=True)

    patient     = relationship("Patient", back_populates="prescriptions")
    appointment = relationship("Appointment", back_populates="prescriptions")
    items       = relationship("PrescriptionItem", back_populates="prescription")


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"
    id                  = Column(Integer, primary_key=True, index=True)
    prescription_id     = Column(Integer, ForeignKey("prescriptions.id"), nullable=False)
    medicine_id         = Column(Integer, ForeignKey("medicines.id"), nullable=True)
    medicine_name       = Column(String(200), nullable=True)
    dosage              = Column(String(100), nullable=True)
    frequency           = Column(String(100), nullable=True)
    duration            = Column(String(100), nullable=True)
    instructions        = Column(Text, nullable=True)
    quantity_prescribed = Column(Integer, nullable=True)
    quantity_dispensed  = Column(Integer, nullable=True)

    prescription = relationship("Prescription", back_populates="items")
    medicine     = relationship("Medicine", back_populates="prescription_items")


class LabTest(Base):
    __tablename__ = "lab_tests"
    id               = Column(Integer, primary_key=True, index=True)
    branch_id        = Column(Integer, ForeignKey("branches.id"), nullable=True)
    name             = Column(String(200), nullable=False)
    code             = Column(String(50), nullable=True)
    category         = Column(String(100), nullable=True)
    price            = Column(Numeric(10, 2), nullable=True)
    normal_range     = Column(String(200), nullable=True)
    unit             = Column(String(50), nullable=True)
    turnaround_hours = Column(Integer, nullable=True)
    is_active        = Column(Boolean, default=True)



class Invoice(Base):
    __tablename__ = "invoices"
    id             = Column(Integer, primary_key=True, index=True)
    clinic_id      = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id      = Column(Integer, ForeignKey("branches.id"), nullable=True)
    patient_id       = Column(Integer, ForeignKey("patients.id"), nullable=True)
    appointment_id   = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    admission_id     = Column(Integer, ForeignKey("admissions.id"), nullable=True)
    encounter_type   = Column(String(2), default="OP")   # OP | IP
    invoice_number   = Column(String(50), nullable=True)
    status           = Column(String(50), default="pending")
    sale_type        = Column(String(20), default='prescription')
    customer_name    = Column(String(200), nullable=True)
    customer_mobile  = Column(String(20), nullable=True)
    prescription_ref = Column(String(100), nullable=True)
    subtotal         = Column(Numeric(10, 2), default=0)
    discount         = Column(Numeric(10, 2), default=0)
    tax              = Column(Numeric(10, 2), default=0)
    gst_amount       = Column(Numeric(10, 2), default=0)
    total            = Column(Numeric(10, 2), default=0)
    amount_paid      = Column(Numeric(10, 2), default=0)
    payment_method   = Column(String(50), nullable=True)
    notes                = Column(Text, nullable=True)
    created_at           = Column(DateTime, server_default=func.now())
    paid_at              = Column(DateTime, nullable=True)
    razorpay_order_id    = Column(String(100), nullable=True, index=True)
    razorpay_payment_id  = Column(String(100), nullable=True)

    patient     = relationship("Patient", back_populates="invoices")
    appointment = relationship("Appointment", back_populates="invoices")
    items       = relationship("InvoiceItem", back_populates="invoice")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    id               = Column(Integer, primary_key=True, index=True)
    invoice_id       = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    medicine_id      = Column(Integer, ForeignKey("medicines.id"), nullable=True)
    description      = Column(String(500), nullable=True)
    item_type        = Column(String(50), nullable=True)
    quantity         = Column(Integer, default=1)
    unit_price       = Column(Numeric(10, 2), nullable=True)
    mrp              = Column(Numeric(10, 2), nullable=True)
    discount_amount  = Column(Numeric(10, 2), default=0)
    hsn_code         = Column(String(20), nullable=True)
    gst_rate         = Column(Numeric(5, 2), nullable=True)
    gst_amount       = Column(Numeric(10, 2), nullable=True)
    total            = Column(Numeric(10, 2), nullable=True)

    invoice = relationship("Invoice", back_populates="items")


class PatientReferral(Base):
    __tablename__ = "patient_referrals"
    id             = Column(Integer, primary_key=True, index=True)
    from_clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    from_doctor_id = Column(Integer, ForeignKey("doctor_profiles.id"), nullable=True)
    patient_id     = Column(Integer, ForeignKey("patients.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    to_clinic_id   = Column(Integer, ForeignKey("clinics.id"), nullable=True)
    to_doctor_id   = Column(Integer, ForeignKey("doctor_profiles.id"), nullable=True)
    reason         = Column(Text, nullable=True)
    urgency        = Column(String(50), nullable=True)
    clinical_notes = Column(Text, nullable=True)
    status         = Column(String(50), default="pending")
    referral_code  = Column(String(50), nullable=True)
    response_notes = Column(Text, nullable=True)
    responded_at   = Column(DateTime, nullable=True)
    completed_at   = Column(DateTime, nullable=True)
    created_at     = Column(DateTime, server_default=func.now())
    updated_at     = Column(DateTime, server_default=func.now(), onupdate=func.now())

    patient     = relationship("Patient")
    from_clinic = relationship("Clinic", foreign_keys=[from_clinic_id])
    to_clinic   = relationship("Clinic", foreign_keys=[to_clinic_id])
    from_doctor = relationship("DoctorProfile", foreign_keys=[from_doctor_id])
    to_doctor   = relationship("DoctorProfile", foreign_keys=[to_doctor_id])


# ── Lab Orders & Results ───────────────────────────────────────────────────────

class LabOrder(Base):
    __tablename__ = "lab_orders"
    id              = Column(Integer, primary_key=True, index=True)
    order_id        = Column(String(20), unique=True, nullable=False, index=True)  # LAB-00001
    clinic_id       = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id       = Column(Integer, ForeignKey("branches.id"), nullable=True)
    patient_id      = Column(Integer, ForeignKey("patients.id"), nullable=False)
    appointment_id  = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    ordered_by      = Column(Integer, ForeignKey("staff.id"), nullable=False)   # doctor
    test_names      = Column(JSON, default=list)   # ['CBC', 'LFT', 'RBS']
    clinical_notes  = Column(Text, nullable=True)
    priority        = Column(String(20), default='routine')  # routine|urgent|stat
    specimen_type   = Column(String(100), nullable=True)
    status          = Column(String(30), default='pending')
    # pending → collected → processing → pending_review → signed → cancelled
    collected_at    = Column(DateTime, nullable=True)
    abha_id         = Column(String(50), nullable=True)
    created_at      = Column(DateTime, server_default=func.now())

    result          = relationship("LabResult", back_populates="order", uselist=False)
    patient         = relationship("Patient")
    ordered_by_staff = relationship("Staff", foreign_keys=[ordered_by])
    items           = relationship("LabOrderItem", back_populates="order")


class LabOrderItem(Base):
    __tablename__ = "lab_order_items"
    id           = Column(Integer, primary_key=True, index=True)
    order_id     = Column(Integer, ForeignKey("lab_orders.id"), nullable=False)
    test_id      = Column(Integer, ForeignKey("lab_tests.id"), nullable=True)
    test_name    = Column(String(200), nullable=True)
    result_value = Column(Text, nullable=True)
    result_notes = Column(Text, nullable=True)
    is_abnormal  = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)

    order = relationship("LabOrder", back_populates="items")
    test  = relationship("LabTest")


class LabResult(Base):
    __tablename__ = "lab_results"
    id              = Column(Integer, primary_key=True, index=True)
    order_id        = Column(Integer, ForeignKey("lab_orders.id"), unique=True, nullable=False)
    raw_format      = Column(String(20))           # HL7_ORU | ASTM_LIS02 | PDF | MANUAL
    observations    = Column(JSON, default=list)   # [{test_name, value, unit, ref_range, flag}]
    fhir_report     = Column(JSON, nullable=True)  # Full FHIR DiagnosticReport
    pdf_b64         = Column(Text, nullable=True)  # Base64 PDF if uploaded
    interpretation  = Column(Text, nullable=True)  # Pathologist's text
    status          = Column(String(30), default='pending_review')
    # pending_review → signed | rejected | amended
    signed_by       = Column(Integer, ForeignKey("staff.id"), nullable=True)
    signed_at       = Column(DateTime, nullable=True)
    report_hash     = Column(String(64), nullable=True)   # SHA-256 for tamper detection
    amended_from    = Column(Integer, ForeignKey("lab_results.id"), nullable=True)
    source          = Column(String(30), default='bridge')  # bridge | manual | pdf_upload
    created_at      = Column(DateTime, server_default=func.now())

    order           = relationship("LabOrder", back_populates="result")
    signed_by_staff = relationship("Staff", foreign_keys=[signed_by])


# ── Imaging Orders & Results ───────────────────────────────────────────────────

class ImagingOrder(Base):
    __tablename__ = "imaging_orders"
    id              = Column(Integer, primary_key=True, index=True)
    order_id        = Column(String(20), unique=True, nullable=False, index=True)  # IMG-00001
    clinic_id       = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id       = Column(Integer, ForeignKey("branches.id"), nullable=True)
    patient_id      = Column(Integer, ForeignKey("patients.id"), nullable=False)
    appointment_id  = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    ordered_by      = Column(Integer, ForeignKey("staff.id"), nullable=False)
    modality        = Column(String(10), nullable=True)  # CT, MR, CR, DX, US...
    body_part       = Column(String(100), nullable=True)
    study_description = Column(Text, nullable=True)
    clinical_notes  = Column(Text, nullable=True)
    priority        = Column(String(20), default='routine')
    status          = Column(String(30), default='pending')
    # pending → scheduled → acquired → pending_review → signed → cancelled
    abha_id         = Column(String(50), nullable=True)
    created_at      = Column(DateTime, server_default=func.now())

    result          = relationship("ImagingResult", back_populates="order", uselist=False)
    patient         = relationship("Patient")
    ordered_by_staff = relationship("Staff", foreign_keys=[ordered_by])


class ImagingResult(Base):
    __tablename__ = "imaging_results"
    id              = Column(Integer, primary_key=True, index=True)
    order_id        = Column(Integer, ForeignKey("imaging_orders.id"), unique=True, nullable=False)
    modality        = Column(String(10), nullable=True)
    study_uid       = Column(String(200), nullable=True)
    series_uid      = Column(String(200), nullable=True)
    dicom_metadata  = Column(JSON, nullable=True)   # extracted DICOM tags
    fhir_report     = Column(JSON, nullable=True)   # FHIR ImagingStudy
    key_image_paths = Column(JSON, default=list)    # local file paths on clinic PC
    pdf_b64         = Column(Text, nullable=True)   # fallback PDF
    findings        = Column(Text, nullable=True)   # Radiologist's findings
    impression      = Column(Text, nullable=True)   # Radiologist's impression/diagnosis
    status          = Column(String(30), default='pending_review')
    signed_by       = Column(Integer, ForeignKey("staff.id"), nullable=True)
    signed_at       = Column(DateTime, nullable=True)
    report_hash     = Column(String(64), nullable=True)
    source          = Column(String(30), default='bridge')
    created_at      = Column(DateTime, server_default=func.now())

    order           = relationship("ImagingOrder", back_populates="result")
    signed_by_staff = relationship("Staff", foreign_keys=[signed_by])


# ── Unmatched Results Queue ────────────────────────────────────────────────────

class UnmatchedResult(Base):
    __tablename__ = "unmatched_results"
    id           = Column(Integer, primary_key=True, index=True)
    clinic_id    = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    source       = Column(String(30))      # bridge_hl7 | bridge_astm | bridge_dicom | pdf_upload
    raw_format   = Column(String(20))
    parsed_data  = Column(JSON)            # whatever the parser extracted
    patient_hint = Column(String(200))     # patient name/id from the message, for manual matching
    resolved     = Column(Boolean, default=False)
    resolved_by  = Column(Integer, ForeignKey("staff.id"), nullable=True)
    resolved_at  = Column(DateTime, nullable=True)
    linked_lab_order_id     = Column(Integer, ForeignKey("lab_orders.id"), nullable=True)
    linked_imaging_order_id = Column(Integer, ForeignKey("imaging_orders.id"), nullable=True)
    created_at   = Column(DateTime, server_default=func.now())



class DoctorRating(Base):
    __tablename__ = "doctor_ratings"
    id             = Column(Integer, primary_key=True, index=True)
    doctor_id      = Column(Integer, ForeignKey("doctor_profiles.id"), nullable=False)
    patient_id     = Column(Integer, ForeignKey("patients.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    rating         = Column(Integer, nullable=False)
    review         = Column(Text, nullable=True)
    is_visible     = Column(Boolean, default=True)
    created_at     = Column(DateTime, server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id          = Column(Integer, primary_key=True, index=True)
    action      = Column(String(100), nullable=False)  # approved_clinic|rejected_clinic|suspended_clinic|revoked_clinic|reactivated_clinic|verified_staff|rejected_staff|changed_plan
    target_type = Column(String(20), nullable=False)   # clinic|staff
    target_id   = Column(Integer, nullable=False)
    target_name = Column(String(200), nullable=True)
    admin_id    = Column(Integer, ForeignKey("platform_admins.id"), nullable=True)
    admin_name  = Column(String(200), nullable=True)
    reason      = Column(String(100), nullable=True)
    comment     = Column(Text, nullable=True)
    created_at  = Column(DateTime, server_default=func.now())

    admin = relationship("PlatformAdmin")


class BillingWaiverLog(Base):
    __tablename__ = "billing_waiver_logs"
    id            = Column(Integer, primary_key=True, index=True)
    invoice_id    = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    clinic_id     = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    waived_by     = Column(Integer, ForeignKey("staff.id"), nullable=False)
    waiver_amount = Column(Numeric(10, 2), nullable=False)
    reason        = Column(String(50), nullable=False)
    notes         = Column(Text, nullable=True)
    created_at    = Column(DateTime, server_default=func.now())


# ── Pharmacy Extended Models ───────────────────────────────────────────────────

class Supplier(Base):
    __tablename__ = "suppliers"
    id                  = Column(Integer, primary_key=True, index=True)
    clinic_id           = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    name                = Column(String(200), nullable=False)
    contact_person      = Column(String(200), nullable=True)
    mobile              = Column(String(20), nullable=True)
    email               = Column(String(150), nullable=True)
    address             = Column(Text, nullable=True)
    gstin               = Column(String(20), nullable=True)
    drug_license_number = Column(String(100), nullable=True)
    payment_terms       = Column(Integer, default=30)
    notes               = Column(Text, nullable=True)
    is_active           = Column(Boolean, default=True)
    created_at          = Column(DateTime, server_default=func.now())

    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id             = Column(Integer, primary_key=True, index=True)
    clinic_id      = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id      = Column(Integer, ForeignKey("branches.id"), nullable=True)
    supplier_id    = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    po_number      = Column(String(50), nullable=True, index=True)
    status         = Column(String(20), default="draft")
    expected_date  = Column(Date, nullable=True)
    notes          = Column(Text, nullable=True)
    total_amount   = Column(Numeric(12, 2), default=0)
    created_by     = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_at     = Column(DateTime, server_default=func.now())

    supplier = relationship("Supplier", back_populates="purchase_orders")
    items    = relationship("PurchaseOrderItem", back_populates="po", cascade="all, delete-orphan")


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    id                  = Column(Integer, primary_key=True, index=True)
    po_id               = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    medicine_id         = Column(Integer, ForeignKey("medicines.id"), nullable=True)
    medicine_name       = Column(String(200), nullable=True)
    quantity_ordered    = Column(Integer, default=0)
    quantity_received   = Column(Integer, default=0)
    unit_cost           = Column(Numeric(10, 2), nullable=True)
    total_cost          = Column(Numeric(10, 2), nullable=True)
    batch_number        = Column(String(50), nullable=True)
    expiry_date         = Column(Date, nullable=True)

    po = relationship("PurchaseOrder", back_populates="items")


class SalesReturn(Base):
    __tablename__ = "sales_returns"
    id             = Column(Integer, primary_key=True, index=True)
    clinic_id      = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    invoice_id     = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    return_number  = Column(String(50), nullable=True)
    reason         = Column(String(100), nullable=True)
    total_refund   = Column(Numeric(10, 2), default=0)
    refund_method  = Column(String(50), nullable=True)
    processed_by   = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_at     = Column(DateTime, server_default=func.now())

    items = relationship("SalesReturnItem", back_populates="sales_return", cascade="all, delete-orphan")


class SalesReturnItem(Base):
    __tablename__ = "sales_return_items"
    id            = Column(Integer, primary_key=True, index=True)
    return_id     = Column(Integer, ForeignKey("sales_returns.id"), nullable=False)
    medicine_id   = Column(Integer, ForeignKey("medicines.id"), nullable=True)
    medicine_name = Column(String(200), nullable=True)
    quantity      = Column(Integer, default=0)
    unit_price    = Column(Numeric(10, 2), nullable=True)
    total         = Column(Numeric(10, 2), nullable=True)

    sales_return = relationship("SalesReturn", back_populates="items")


class DrugRegister(Base):
    __tablename__ = "drug_register"
    id                = Column(Integer, primary_key=True, index=True)
    clinic_id         = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    invoice_id        = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    medicine_id       = Column(Integer, ForeignKey("medicines.id"), nullable=True)
    medicine_name     = Column(String(200), nullable=True)
    schedule          = Column(String(10), nullable=True)
    patient_name      = Column(String(200), nullable=True)
    patient_age       = Column(Integer, nullable=True)
    patient_address   = Column(Text, nullable=True)
    doctor_name       = Column(String(200), nullable=True)
    doctor_reg_number = Column(String(100), nullable=True)
    quantity          = Column(Integer, default=0)
    batch_number      = Column(String(50), nullable=True)
    sold_at           = Column(DateTime, server_default=func.now())


class MedicineBatch(Base):
    __tablename__ = "medicine_batches"
    id           = Column(Integer, primary_key=True, index=True)
    medicine_id  = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    clinic_id    = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id    = Column(Integer, ForeignKey("branches.id"), nullable=True)
    batch_number = Column(String(50), nullable=True)
    expiry_date  = Column(Date, nullable=True)
    quantity     = Column(Integer, default=0)
    unit_cost    = Column(Numeric(10, 2), nullable=True)
    supplier_id  = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    received_at  = Column(DateTime, server_default=func.now())


class StockTransaction(Base):
    __tablename__ = "stock_transactions"
    id               = Column(Integer, primary_key=True, index=True)
    clinic_id        = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id        = Column(Integer, ForeignKey("branches.id"), nullable=True)
    medicine_id      = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    transaction_type = Column(String(20), nullable=False)
    quantity         = Column(Integer, nullable=False)
    quantity_before  = Column(Integer, nullable=False)
    quantity_after   = Column(Integer, nullable=False)
    batch_number     = Column(String(50), nullable=True)
    expiry_date      = Column(Date, nullable=True)
    unit_cost        = Column(Numeric(10, 2), nullable=True)
    supplier_name    = Column(String(200), nullable=True)
    notes            = Column(Text, nullable=True)
    performed_by     = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_at       = Column(DateTime, server_default=func.now())

    medicine = relationship("Medicine")


# ── Internal Clinic Chat ───────────────────────────────────────────────────────

class ChatRoom(Base):
    __tablename__ = "chat_rooms"
    id         = Column(Integer, primary_key=True, index=True)
    clinic_id  = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    room_type  = Column(String(20), default="direct")  # direct | group
    name       = Column(String(200), nullable=True)    # for group rooms
    created_at = Column(DateTime, server_default=func.now())

    members  = relationship("ChatRoomMember", back_populates="room")
    messages = relationship("InternalMessage", back_populates="room")


class ChatRoomMember(Base):
    __tablename__ = "chat_room_members"
    id        = Column(Integer, primary_key=True, index=True)
    room_id   = Column(Integer, ForeignKey("chat_rooms.id"), nullable=False)
    staff_id  = Column(Integer, ForeignKey("staff.id"), nullable=False)
    joined_at = Column(DateTime, server_default=func.now())
    __table_args__ = (UniqueConstraint("room_id", "staff_id"),)

    room  = relationship("ChatRoom", back_populates="members")
    staff = relationship("Staff")


class InternalMessage(Base):
    __tablename__ = "internal_messages"
    id         = Column(Integer, primary_key=True, index=True)
    room_id    = Column(Integer, ForeignKey("chat_rooms.id"), nullable=False)
    sender_id  = Column(Integer, ForeignKey("staff.id"), nullable=False)
    body       = Column(Text, nullable=False)
    msg_type   = Column(String(20), default="text")  # text | shortcut
    created_at = Column(DateTime, server_default=func.now())

    room   = relationship("ChatRoom", back_populates="messages")
    sender = relationship("Staff")
    reads  = relationship("MessageRead", back_populates="message")


class MessageRead(Base):
    __tablename__ = "message_reads"
    id         = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("internal_messages.id"), nullable=False)
    staff_id   = Column(Integer, ForeignKey("staff.id"), nullable=False)
    read_at    = Column(DateTime, server_default=func.now())
    __table_args__ = (UniqueConstraint("message_id", "staff_id"),)

    message = relationship("InternalMessage", back_populates="reads")


# ── Imaging Phase 1 Extensions ────────────────────────────────────────────────

class ImagingReportTemplate(Base):
    __tablename__ = "imaging_report_templates"
    id                   = Column(Integer, primary_key=True, index=True)
    clinic_id            = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    modality             = Column(String(10), nullable=False)
    name                 = Column(String(200), nullable=False)
    findings_template    = Column(Text, nullable=True)
    impression_template  = Column(Text, nullable=True)
    body_part            = Column(String(100), nullable=True)
    is_active            = Column(Boolean, default=True)
    created_at           = Column(DateTime, server_default=func.now())


class ImagingCriticalAlert(Base):
    __tablename__ = "imaging_critical_alerts"
    id               = Column(Integer, primary_key=True, index=True)
    clinic_id        = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    order_id         = Column(Integer, ForeignKey("imaging_orders.id"), nullable=False)
    alert_type       = Column(String(50), nullable=False)
    description      = Column(Text, nullable=True)
    alerted_by       = Column(Integer, ForeignKey("staff.id"), nullable=False)
    alerted_at       = Column(DateTime, server_default=func.now())
    acknowledged_by  = Column(Integer, ForeignKey("staff.id"), nullable=True)
    acknowledged_at  = Column(DateTime, nullable=True)

    order            = relationship("ImagingOrder", foreign_keys=[order_id])
    alerted_by_staff = relationship("Staff", foreign_keys=[alerted_by])
    ack_by_staff     = relationship("Staff", foreign_keys=[acknowledged_by])


# ── Imaging Phase 2: Referring Doctors & Schedule ─────────────────────────────

class ReferringDoctor(Base):
    __tablename__ = "referring_doctors"
    id                  = Column(Integer, primary_key=True, index=True)
    clinic_id           = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    name                = Column(String(200), nullable=False)
    registration_number = Column(String(100), nullable=True)
    specialization      = Column(String(200), nullable=True)
    hospital            = Column(String(200), nullable=True)
    mobile              = Column(String(20), nullable=True)
    email               = Column(String(150), nullable=True)
    address             = Column(Text, nullable=True)
    notes               = Column(Text, nullable=True)
    is_active           = Column(Boolean, default=True)
    created_at          = Column(DateTime, server_default=func.now())


class ImagingSlot(Base):
    __tablename__ = "imaging_slots"
    id         = Column(Integer, primary_key=True, index=True)
    clinic_id  = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    date       = Column(Date, nullable=False)
    time       = Column(String(5), nullable=False)   # "09:00"
    modality   = Column(String(10), nullable=False)
    capacity   = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())

    bookings   = relationship("ImagingBooking", back_populates="slot")


class ImagingBooking(Base):
    __tablename__ = "imaging_bookings"
    id               = Column(Integer, primary_key=True, index=True)
    slot_id          = Column(Integer, ForeignKey("imaging_slots.id"), nullable=False)
    clinic_id        = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    patient_name     = Column(String(200), nullable=False)
    patient_mobile   = Column(String(20), nullable=True)
    modality         = Column(String(10), nullable=True)
    study_description = Column(Text, nullable=True)
    referring_doctor = Column(String(200), nullable=True)
    priority         = Column(String(20), default='routine')
    notes            = Column(Text, nullable=True)
    order_id         = Column(Integer, ForeignKey("imaging_orders.id"), nullable=True)
    created_at       = Column(DateTime, server_default=func.now())

    slot             = relationship("ImagingSlot", back_populates="bookings")


# ── Phase 0: Inpatient Foundation ─────────────────────────────────────────────

class Department(Base):
    __tablename__ = "departments"
    id             = Column(Integer, primary_key=True, index=True)
    clinic_id      = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    name           = Column(String(200), nullable=False)
    code           = Column(String(10), nullable=True)
    dept_type      = Column(String(20), default='clinical')
    head_doctor_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    color_hex      = Column(String(7), nullable=True)
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime, server_default=func.now())

    wards          = relationship("Ward", back_populates="department")
    staff_depts    = relationship("StaffDepartment", back_populates="department")


class Ward(Base):
    __tablename__ = "wards"
    id            = Column(Integer, primary_key=True, index=True)
    clinic_id     = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    name          = Column(String(200), nullable=False)
    floor         = Column(String(20), nullable=True)
    wing          = Column(String(50), nullable=True)
    ward_type     = Column(String(20), default='general')
    total_beds    = Column(Integer, default=0)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, server_default=func.now())

    department = relationship("Department", back_populates="wards")
    beds       = relationship("Bed", back_populates="ward")


class Bed(Base):
    __tablename__ = "beds"
    id                   = Column(Integer, primary_key=True, index=True)
    clinic_id            = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    ward_id              = Column(Integer, ForeignKey("wards.id"), nullable=False)
    bed_number           = Column(String(20), nullable=False)
    bed_type             = Column(String(20), default='general')
    status               = Column(String(20), default='vacant')
    current_admission_id = Column(Integer, nullable=True)
    created_at           = Column(DateTime, server_default=func.now())

    ward = relationship("Ward", back_populates="beds")


class Admission(Base):
    __tablename__ = "admissions"
    id                    = Column(Integer, primary_key=True, index=True)
    clinic_id             = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id             = Column(Integer, ForeignKey("branches.id"), nullable=True)
    patient_id            = Column(Integer, ForeignKey("patients.id"), nullable=False)
    admission_number      = Column(String(30), unique=True, nullable=False)
    admission_sequence    = Column(Integer, nullable=False)
    encounter_no          = Column(String(24), nullable=True, index=True)  # unified encounter key, e.g. HC00001-ENC-000123
    department_id         = Column(Integer, ForeignKey("departments.id"), nullable=True)
    ward_id               = Column(Integer, ForeignKey("wards.id"), nullable=True)
    bed_id                = Column(Integer, ForeignKey("beds.id"), nullable=True)
    admission_type        = Column(String(20), default='opd_referred')
    source_appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    admitting_doctor_id   = Column(Integer, ForeignKey("staff.id"), nullable=False)
    primary_doctor_id     = Column(Integer, ForeignKey("staff.id"), nullable=True)
    primary_diagnosis     = Column(Text, nullable=True)
    admitted_at           = Column(DateTime, server_default=func.now())
    discharged_at         = Column(DateTime, nullable=True)
    expected_discharge    = Column(Date, nullable=True)
    status                = Column(String(20), default='active')
    chart_pin_hash        = Column(String, nullable=True)
    tpa_id                = Column(String(50), nullable=True)
    insurance_company     = Column(String(200), nullable=True)
    policy_number         = Column(String(100), nullable=True)
    pre_auth_number       = Column(String(100), nullable=True)
    # Emergency pre-registration fields
    triage_level          = Column(String(10), nullable=True)   # red|orange|yellow|green
    brought_by            = Column(String(50), nullable=True)   # ambulance|relative|police|walk_in|other
    eta_minutes           = Column(Integer, nullable=True)
    caller_name           = Column(String(200), nullable=True)
    caller_mobile         = Column(String(20), nullable=True)
    arrived_at            = Column(DateTime, nullable=True)
    initial_vitals        = Column(JSON, nullable=True)         # {bp, pulse, spo2, temp, rr, gcs}
    alert_sent_at         = Column(DateTime, nullable=True)
    alert_sent_by         = Column(Integer, ForeignKey("staff.id"), nullable=True)
    alert_ack_at          = Column(DateTime, nullable=True)
    alert_ack_by          = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_by            = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_at            = Column(DateTime, server_default=func.now())

    patient    = relationship("Patient", foreign_keys=[patient_id])
    department = relationship("Department", foreign_keys=[department_id])
    ward       = relationship("Ward", foreign_keys=[ward_id])
    bed        = relationship("Bed", foreign_keys=[bed_id])
    doctor     = relationship("Staff", foreign_keys=[admitting_doctor_id])
    transfers  = relationship("AdmissionTransfer", back_populates="admission")


class AdmissionTransfer(Base):
    __tablename__ = "admission_transfers"
    id                 = Column(Integer, primary_key=True, index=True)
    admission_id       = Column(Integer, ForeignKey("admissions.id"), nullable=False)
    from_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    from_ward_id       = Column(Integer, ForeignKey("wards.id"), nullable=True)
    from_bed_id        = Column(Integer, ForeignKey("beds.id"), nullable=True)
    to_department_id   = Column(Integer, ForeignKey("departments.id"), nullable=True)
    to_ward_id         = Column(Integer, ForeignKey("wards.id"), nullable=True)
    to_bed_id          = Column(Integer, ForeignKey("beds.id"), nullable=True)
    transferred_at     = Column(DateTime, server_default=func.now())
    transferred_by     = Column(Integer, ForeignKey("staff.id"), nullable=True)
    reason             = Column(Text, nullable=True)

    admission = relationship("Admission", back_populates="transfers")


class StaffDepartment(Base):
    __tablename__ = "staff_departments"
    id            = Column(Integer, primary_key=True, index=True)
    staff_id      = Column(Integer, ForeignKey("staff.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    is_primary    = Column(Boolean, default=True)

    department = relationship("Department", back_populates="staff_depts")


class AppointmentTokenSequence(Base):
    __tablename__ = "appointment_token_sequences"
    id         = Column(Integer, primary_key=True, index=True)
    clinic_id  = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id  = Column(Integer, ForeignKey("branches.id"), nullable=False)
    doctor_id  = Column(Integer, ForeignKey("staff.id"), nullable=False)
    date       = Column(Date, nullable=False)
    last_token = Column(Integer, nullable=False, default=0)


class InpatientReferral(Base):
    __tablename__ = "referrals"
    id                       = Column(Integer, primary_key=True, index=True)
    clinic_id                = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    patient_id               = Column(Integer, ForeignKey("patients.id"), nullable=False)
    bhid                     = Column(String(15), nullable=True)
    referral_number          = Column(String(30), unique=True, nullable=False)
    referring_type           = Column(String(20), default='internal')
    referring_doctor_id      = Column(Integer, ForeignKey("staff.id"), nullable=True)
    referring_doctor_name    = Column(String(200), nullable=True)
    referring_doctor_reg     = Column(String(100), nullable=True)
    referring_org_name       = Column(String(200), nullable=True)
    referred_to_type         = Column(String(20), default='external_outside')
    referred_to_clinic_id    = Column(Integer, ForeignKey("clinics.id"), nullable=True)
    referred_to_doctor_id    = Column(Integer, ForeignKey("staff.id"), nullable=True)
    referred_to_doctor_name  = Column(String(200), nullable=True)
    referred_to_specialty    = Column(String(100), nullable=True)
    referred_to_org_name     = Column(String(200), nullable=True)
    urgency                  = Column(String(20), default='routine')
    reason                   = Column(Text, nullable=True)
    clinical_summary         = Column(Text, nullable=True)
    current_medications      = Column(Text, nullable=True)
    relevant_investigations  = Column(Text, nullable=True)
    source_appointment_id    = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    source_admission_id      = Column(Integer, ForeignKey("admissions.id"), nullable=True)
    status                   = Column(String(20), default='draft')
    referred_at              = Column(DateTime, server_default=func.now())
    accepted_at              = Column(DateTime, nullable=True)
    completed_at             = Column(DateTime, nullable=True)
    rejection_reason         = Column(Text, nullable=True)
    outcome_notes            = Column(Text, nullable=True)
    resulted_in_admission    = Column(Boolean, default=False)
    destination_admission_id = Column(Integer, ForeignKey("admissions.id"), nullable=True)
    created_by               = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_at               = Column(DateTime, server_default=func.now())

    patient          = relationship("Patient", foreign_keys=[patient_id])
    referring_doctor = relationship("Staff", foreign_keys=[referring_doctor_id])
    source_appt      = relationship("Appointment", foreign_keys=[source_appointment_id])


# ── Phase 2: Nursing / Ward Models ────────────────────────────────────────────

from datetime import datetime as _datetime

class VitalSign(Base):
    __tablename__ = "vital_signs"
    id             = Column(Integer, primary_key=True)
    admission_id   = Column(Integer, ForeignKey("admissions.id"), nullable=False)
    clinic_id      = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id      = Column(Integer, ForeignKey("branches.id"), nullable=True)
    recorded_by    = Column(Integer, ForeignKey("staff.id"), nullable=False)
    recorded_at    = Column(DateTime, default=_datetime.utcnow)
    temperature    = Column(Numeric(4, 1))        # Celsius
    pulse          = Column(Integer)              # bpm
    respiration_rate = Column(Integer)            # breaths/min
    bp_systolic    = Column(Integer)              # mmHg
    bp_diastolic   = Column(Integer)              # mmHg
    spo2           = Column(Numeric(5, 2))        # %
    weight         = Column(Numeric(5, 2))        # kg
    height         = Column(Numeric(5, 2))        # cm
    pain_score     = Column(Integer)              # 0-10
    notes          = Column(Text)
    created_at     = Column(DateTime, default=_datetime.utcnow)


class NursingNote(Base):
    __tablename__ = "nursing_notes"
    id           = Column(Integer, primary_key=True)
    admission_id = Column(Integer, ForeignKey("admissions.id"), nullable=False)
    clinic_id    = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id    = Column(Integer, ForeignKey("branches.id"), nullable=True)
    note_type    = Column(String(30), default="general")  # general/shift_handoff/incident/procedure
    note_text    = Column(Text, nullable=False)
    written_by   = Column(Integer, ForeignKey("staff.id"), nullable=False)
    written_at   = Column(DateTime, default=_datetime.utcnow)
    shift        = Column(String(10))              # morning/afternoon/night
    is_handoff   = Column(Boolean, default=False)
    created_at   = Column(DateTime, default=_datetime.utcnow)


class MedicationAdministration(Base):
    __tablename__ = "medication_administrations"
    id              = Column(Integer, primary_key=True)
    admission_id    = Column(Integer, ForeignKey("admissions.id"), nullable=False)
    clinic_id       = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id       = Column(Integer, ForeignKey("branches.id"), nullable=True)
    medicine_name   = Column(String(200), nullable=False)
    dose            = Column(String(100))
    route           = Column(String(50))           # oral/iv/im/sc/topical
    scheduled_time  = Column(DateTime)
    administered_at = Column(DateTime)
    administered_by = Column(Integer, ForeignKey("staff.id"))
    status          = Column(String(20), default="scheduled")  # scheduled/given/missed/held/refused
    reason_held     = Column(String(200))
    notes           = Column(Text)
    created_at      = Column(DateTime, default=_datetime.utcnow)


class WardRound(Base):
    __tablename__ = "ward_rounds"
    id           = Column(Integer, primary_key=True)
    admission_id = Column(Integer, ForeignKey("admissions.id"), nullable=False)
    clinic_id    = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    doctor_id    = Column(Integer, ForeignKey("staff.id"), nullable=False)
    round_date   = Column(Date, nullable=False)
    subjective   = Column(Text)
    objective    = Column(Text)
    assessment   = Column(Text)
    plan         = Column(Text)
    created_at   = Column(DateTime, default=_datetime.utcnow)


# ── Phase 3: Clinical Endpoints ───────────────────────────────────────────────

from datetime import datetime

class DischargeSummary(Base):
    __tablename__ = "discharge_summaries"
    id = Column(Integer, primary_key=True)
    admission_id = Column(Integer, ForeignKey("admissions.id"), unique=True, nullable=False)
    clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    written_by = Column(Integer, ForeignKey("staff.id"), nullable=False)
    # Clinical content
    admission_diagnosis = Column(Text)
    final_diagnosis = Column(Text)
    procedures_done = Column(Text)
    hospital_course = Column(Text)       # summary of stay
    condition_at_discharge = Column(String(50))  # stable/improved/deteriorated/deceased
    discharge_instructions = Column(Text)
    follow_up_date = Column(Date)
    follow_up_with = Column(String(200))
    diet_advice = Column(Text)
    activity_restrictions = Column(Text)
    # Medications on discharge
    discharge_medications = Column(Text)  # JSON string: [{name, dose, route, frequency, duration}]
    # Status
    status = Column(String(20), default="draft")  # draft / finalized
    finalized_at = Column(DateTime)
    finalized_by = Column(Integer, ForeignKey("staff.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ProgressNote(Base):
    __tablename__ = "progress_notes"
    id = Column(Integer, primary_key=True)
    admission_id = Column(Integer, ForeignKey("admissions.id"), nullable=False)
    clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    written_by = Column(Integer, ForeignKey("staff.id"), nullable=False)
    note_date = Column(Date, nullable=False)
    note_time = Column(DateTime, default=datetime.utcnow)
    # SOAP
    subjective = Column(Text)
    objective = Column(Text)
    assessment = Column(Text)
    plan = Column(Text)
    # Extras
    note_type = Column(String(30), default="progress")  # progress/consult/procedure/event
    is_significant = Column(Boolean, default=False)


class InpatientCharge(Base):
    """Running charge line items accumulated during a hospital stay."""
    __tablename__ = "inpatient_charges"
    id             = Column(Integer, primary_key=True)
    admission_id   = Column(Integer, ForeignKey("admissions.id"), nullable=False)
    clinic_id      = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    charge_date    = Column(Date, nullable=False)
    charge_type    = Column(String(30), nullable=False)  # room/procedure/consultation/lab/imaging/pharmacy/misc
    description    = Column(String(300), nullable=False)
    quantity       = Column(Numeric(10, 2), default=1)
    unit_price     = Column(Numeric(10, 2), nullable=False)
    total          = Column(Numeric(10, 2), nullable=False)
    gst_rate       = Column(Numeric(5, 2), default=0)
    gst_amount     = Column(Numeric(10, 2), default=0)
    added_by       = Column(Integer, ForeignKey("staff.id"))
    is_voided      = Column(Boolean, default=False)
    void_reason    = Column(String(200))
    created_at     = Column(DateTime, default=datetime.utcnow)


class InpatientBill(Base):
    """Final consolidated bill generated at discharge."""
    __tablename__ = "inpatient_bills"
    id              = Column(Integer, primary_key=True)
    admission_id    = Column(Integer, ForeignKey("admissions.id"), unique=True, nullable=False)
    clinic_id       = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    invoice_id      = Column(Integer, ForeignKey("invoices.id"), nullable=True)  # linked invoice for payment
    bill_number     = Column(String(30), unique=True, nullable=False)
    # Charge breakdown
    room_charges    = Column(Numeric(10, 2), default=0)
    procedure_charges = Column(Numeric(10, 2), default=0)
    consultation_charges = Column(Numeric(10, 2), default=0)
    lab_charges     = Column(Numeric(10, 2), default=0)
    imaging_charges = Column(Numeric(10, 2), default=0)
    pharmacy_charges = Column(Numeric(10, 2), default=0)
    misc_charges    = Column(Numeric(10, 2), default=0)
    subtotal        = Column(Numeric(10, 2), default=0)
    gst_amount      = Column(Numeric(10, 2), default=0)
    discount        = Column(Numeric(10, 2), default=0)
    total           = Column(Numeric(10, 2), default=0)
    # Insurance
    insurance_claim_amount = Column(Numeric(10, 2), default=0)
    tpa_approved_amount    = Column(Numeric(10, 2), default=0)
    patient_payable        = Column(Numeric(10, 2), default=0)
    # Payment
    amount_paid     = Column(Numeric(10, 2), default=0)
    payment_method  = Column(String(50))
    status          = Column(String(20), default="draft")  # draft/finalized/paid/partially_paid
    notes           = Column(Text)
    generated_by    = Column(Integer, ForeignKey("staff.id"))
    finalized_at    = Column(DateTime)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


class MedicationOrder(Base):
    __tablename__ = "medication_orders"
    id              = Column(Integer, primary_key=True, index=True)
    admission_id    = Column(Integer, ForeignKey("admissions.id"), nullable=False)
    clinic_id       = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    drug_name       = Column(String(200), nullable=False)
    generic_name    = Column(String(200))
    dose            = Column(String(100))
    route           = Column(String(30))         # PO, IV, IM, SC, etc.
    frequency       = Column(String(30))         # OD, BD, TDS, PRN, STAT, etc.
    duration_days   = Column(Integer)
    instructions    = Column(Text)
    is_prn          = Column(Boolean, default=False)
    prn_reason      = Column(String(200))
    is_stat         = Column(Boolean, default=False)
    is_continuous   = Column(Boolean, default=False)
    iv_rate         = Column(String(50))
    iv_fluid        = Column(String(100))
    iv_volume_ml    = Column(String(50))
    notes           = Column(Text)
    status          = Column(String(20), default="active")  # active/discontinued/completed
    ordered_by      = Column(Integer, ForeignKey("staff.id"))
    ordered_at      = Column(DateTime, default=datetime.utcnow)
    discontinued_by = Column(Integer, ForeignKey("staff.id"))
    discontinued_at = Column(DateTime)
    discontinue_reason = Column(String(300))
    created_at      = Column(DateTime, default=datetime.utcnow)

    admission  = relationship("Admission", foreign_keys=[admission_id])
    orderer    = relationship("Staff", foreign_keys=[ordered_by])


class ClinicalOrder(Base):
    __tablename__ = "clinical_orders"
    id            = Column(Integer, primary_key=True, index=True)
    admission_id  = Column(Integer, ForeignKey("admissions.id"), nullable=False)
    clinic_id     = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id     = Column(Integer, ForeignKey("branches.id"), nullable=True)
    order_type    = Column(String(30), nullable=False)   # lab/imaging/procedure/diet/activity/nursing/consult
    order_detail  = Column(String(500), nullable=False)
    priority      = Column(String(20), default="routine")  # stat/urgent/routine
    instructions  = Column(Text)
    status        = Column(String(20), default="pending")  # pending/acknowledged/in_progress/completed/cancelled
    ordered_by    = Column(Integer, ForeignKey("staff.id"))
    ordered_at    = Column(DateTime, default=datetime.utcnow)
    acknowledged_by = Column(Integer, ForeignKey("staff.id"))
    acknowledged_at = Column(DateTime)
    completed_by  = Column(Integer, ForeignKey("staff.id"))
    completed_at  = Column(DateTime)
    result_notes  = Column(Text)
    cancelled_by  = Column(Integer, ForeignKey("staff.id"))
    cancelled_at  = Column(DateTime)
    cancel_reason = Column(String(300))
    created_at    = Column(DateTime, default=datetime.utcnow)

    admission    = relationship("Admission", foreign_keys=[admission_id])
    orderer      = relationship("Staff", foreign_keys=[ordered_by])
    acknowledger = relationship("Staff", foreign_keys=[acknowledged_by])
    completer    = relationship("Staff", foreign_keys=[completed_by])


class DocumentationSession(Base):
    """A 'sign & close' marker that groups all entries above it under one clinician block."""
    __tablename__ = "documentation_sessions"
    id            = Column(Integer, primary_key=True, index=True)
    clinic_id     = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    admission_id  = Column(Integer, ForeignKey("admissions.id"), nullable=False)
    signed_by     = Column(Integer, ForeignKey("staff.id"), nullable=False)
    signed_at     = Column(DateTime, default=datetime.utcnow)
    shift         = Column(String(20))   # morning | afternoon | night
    note          = Column(Text)         # optional closing remark


class AssessmentTemplate(Base):
    """Superadmin or clinic-admin defined assessment form templates."""
    __tablename__ = "assessment_templates"
    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String(200), nullable=False)
    specialty    = Column(String(100), nullable=False)
    description  = Column(Text)
    # fields: list of {key, label, type, options, required, unit}
    fields       = Column(JSON, nullable=False, default=list)
    scope        = Column(String(20), default='platform')  # platform | clinic
    clinic_id    = Column(Integer, ForeignKey("clinics.id"), nullable=True)
    is_active    = Column(Boolean, default=True)
    created_by_admin  = Column(Integer, ForeignKey("platform_admins.id"), nullable=True)
    created_by_staff  = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow)


class TemplateAssignment(Base):
    """Maps an assessment template to clinics / departments (multi-select)."""
    __tablename__ = "template_assignments"
    id            = Column(Integer, primary_key=True, index=True)
    template_id   = Column(Integer, ForeignKey("assessment_templates.id"), nullable=False)
    # scope: all=visible everywhere, clinic=specific clinic, department=specific dept
    scope         = Column(String(20), nullable=False)  # all | clinic | department
    clinic_id     = Column(Integer, ForeignKey("clinics.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    assigned_by   = Column(Integer, ForeignKey("platform_admins.id"), nullable=True)
    assigned_at   = Column(DateTime, default=datetime.utcnow)


class PasswordResetRequest(Base):
    __tablename__ = "password_reset_requests"
    id           = Column(Integer, primary_key=True, index=True)
    staff_id     = Column(Integer, ForeignKey("staff.id"), nullable=False)
    clinic_id    = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    status       = Column(String(20), default="pending")  # pending | resolved | expired
    requested_at = Column(DateTime, default=datetime.utcnow)
    resolved_at  = Column(DateTime, nullable=True)
    resolved_by  = Column(Integer, ForeignKey("staff.id"), nullable=True)
    note         = Column(Text, nullable=True)


# ── Pharmacy Dispensing Workflow (GoFrugal-parity) ────────────────────────────

class PharmacyOrder(Base):
    """Unified order from any source: online Rx upload, walk-in, or CPOE."""
    __tablename__ = "pharmacy_orders"
    id                     = Column(Integer, primary_key=True, index=True)
    clinic_id              = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id              = Column(Integer, ForeignKey("branches.id"), nullable=True)
    patient_id             = Column(Integer, ForeignKey("patients.id"), nullable=True)
    source                 = Column(String(20), nullable=False)   # online | walkin | cpoe
    status                 = Column(String(30), default="pending_fill")
    # pending_fill | filling | ready | dispensed | cancelled
    prescription_image_url = Column(String(500), nullable=True)   # for online orders
    prescription_id        = Column(Integer, ForeignKey("prescriptions.id"), nullable=True)
    patient_name           = Column(String(200), nullable=True)   # walk-in without patient record
    patient_mobile         = Column(String(20), nullable=True)
    notes                  = Column(Text, nullable=True)
    created_by             = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_at             = Column(DateTime, server_default=func.now())
    updated_at             = Column(DateTime, server_default=func.now(), onupdate=func.now())

    patient           = relationship("Patient",      foreign_keys=[patient_id])
    prescription      = relationship("Prescription", foreign_keys=[prescription_id])
    dispense_sessions = relationship("DispenseSession", back_populates="order")


class DispenseSession(Base):
    """One dispensing event — patient picks up medications at counter."""
    __tablename__ = "dispense_sessions"
    id              = Column(Integer, primary_key=True, index=True)
    clinic_id       = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id       = Column(Integer, ForeignKey("branches.id"), nullable=True)
    order_id        = Column(Integer, ForeignKey("pharmacy_orders.id"), nullable=True)
    patient_id      = Column(Integer, ForeignKey("patients.id"), nullable=True)
    dispense_number = Column(Integer, nullable=False)   # auto per-patient: 1, 2, 3…
    status          = Column(String(20), default="draft")  # draft | dispensed | paid | credit
    subtotal        = Column(Numeric(10, 2), default=0)
    gst_total       = Column(Numeric(10, 2), default=0)
    total_amount    = Column(Numeric(10, 2), default=0)
    amount_paid     = Column(Numeric(10, 2), default=0)
    balance_due     = Column(Numeric(10, 2), default=0)
    payment_method  = Column(String(50), nullable=True)   # cash | card | upi | credit
    dispensed_by    = Column(Integer, ForeignKey("staff.id"), nullable=True)
    dispensed_at    = Column(DateTime, nullable=True)
    invoice_id      = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    patient_name    = Column(String(200), nullable=True)  # for walk-in
    patient_mobile  = Column(String(20), nullable=True)
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime, server_default=func.now())

    order   = relationship("PharmacyOrder", back_populates="dispense_sessions")
    patient = relationship("Patient", foreign_keys=[patient_id])
    items   = relationship("DispenseItem", back_populates="session", cascade="all, delete-orphan")


class DispenseItem(Base):
    """One medicine line in a dispense session."""
    __tablename__ = "dispense_items"
    id            = Column(Integer, primary_key=True, index=True)
    session_id    = Column(Integer, ForeignKey("dispense_sessions.id"), nullable=False)
    medicine_id   = Column(Integer, ForeignKey("medicines.id"), nullable=True)
    medicine_name = Column(String(200), nullable=False)
    batch_number  = Column(String(50), nullable=True)
    expiry_date   = Column(Date, nullable=True)
    ordered_qty   = Column(Integer, default=0)
    dispensed_qty = Column(Integer, default=0)
    unit_price    = Column(Numeric(10, 2), default=0)
    mrp           = Column(Numeric(10, 2), nullable=True)
    gst_percent   = Column(Numeric(5, 2), default=0)
    gst_amount    = Column(Numeric(10, 2), default=0)
    line_total    = Column(Numeric(10, 2), default=0)
    is_schedule_h = Column(Boolean, default=False)
    gathered      = Column(Boolean, default=False)  # checklist: physically picked

    session  = relationship("DispenseSession", back_populates="items")
    medicine = relationship("Medicine", foreign_keys=[medicine_id])


# ── Maintenance Requests ──────────────────────────────────────────────────────

class MaintenanceRequest(Base):
    """Hospital maintenance & facility requests submitted from any portal."""
    __tablename__ = "maintenance_requests"
    id            = Column(Integer, primary_key=True, index=True)
    clinic_id     = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    title         = Column(String(300), nullable=False)
    description   = Column(Text, nullable=True)
    category      = Column(String(50),  nullable=False, default="facility")
    # facility | equipment | it_software | other
    priority      = Column(String(20),  nullable=False, default="medium")
    # urgent | high | medium | low
    status        = Column(String(30),  nullable=False, default="new")
    # new | in_progress | resolved | closed
    location      = Column(String(200), nullable=True)
    portal_source = Column(String(50),  nullable=True)
    submitted_by  = Column(Integer, ForeignKey("staff.id"), nullable=True)
    assigned_to   = Column(Integer, ForeignKey("staff.id"), nullable=True)
    notes         = Column(Text, nullable=True)
    resolved_at   = Column(DateTime, nullable=True)
    created_at    = Column(DateTime, server_default=func.now())
    updated_at    = Column(DateTime, server_default=func.now(), onupdate=func.now())

    submitter = relationship("Staff", foreign_keys=[submitted_by])
    assignee  = relationship("Staff", foreign_keys=[assigned_to])
    clinic    = relationship("Clinic", foreign_keys=[clinic_id])


# ═══════════════════════════════════════════════════════════════════
# Platform settings (editable pricing & global config)
# ═══════════════════════════════════════════════════════════════════

class PlatformSetting(Base):
    """Key-value JSON config editable from the admin portal (pricing, fees, discounts)."""
    __tablename__ = "platform_settings"
    key        = Column(String(100), primary_key=True)
    value      = Column(JSON, nullable=False, default=dict)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    updated_by = Column(Integer, ForeignKey("platform_admins.id"), nullable=True)


# ═══════════════════════════════════════════════════════════════════
# Telehealth sessions — lifecycle + join gating
# ═══════════════════════════════════════════════════════════════════

class TelehealthSession(Base):
    """
    One row per telehealth appointment. Controls when join tokens may be
    issued and whether the Daily room exists (room name is deterministic:
    bc-{appointment_id}, so the patient's link never changes).
    States: scheduled | ready | in_progress | completed | expired | cancelled
    """
    __tablename__ = "telehealth_sessions"
    id              = Column(Integer, primary_key=True, index=True)
    appointment_id  = Column(Integer, ForeignKey("appointments.id"), unique=True, nullable=False, index=True)
    clinic_id       = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    room_name       = Column(String(100), nullable=False)
    state           = Column(String(30), default="scheduled", index=True)
    slot_start      = Column(DateTime, nullable=False)   # IST naive, matches appointment storage
    slot_end        = Column(DateTime, nullable=False)
    room_expires_at = Column(DateTime, nullable=True)
    doctor_first_joined_at  = Column(DateTime, nullable=True)
    patient_first_joined_at = Column(DateTime, nullable=True)
    completed_at    = Column(DateTime, nullable=True)
    completed_by    = Column(Integer, ForeignKey("staff.id"), nullable=True)
    reopen_count    = Column(Integer, default=0)
    reopened_until  = Column(DateTime, nullable=True)    # doctor-approved rejoin window
    created_at      = Column(DateTime, server_default=func.now())


class TelehealthSessionEvent(Base):
    """Audit trail of session transitions — doubles as refund evidence."""
    __tablename__ = "telehealth_session_events"
    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("telehealth_sessions.id"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)   # created|doctor_joined|patient_joined|completed|expired|rejoin_window|room_deleted
    actor_type = Column(String(20), nullable=True)    # staff|patient|system
    actor_id   = Column(Integer, nullable=True)
    payload    = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


# ═══════════════════════════════════════════════════════════════════════════════
# Staff Scheduler — shift types, groups, schedule entries, leaves, patterns
# ═══════════════════════════════════════════════════════════════════════════════

class ShiftType(Base):
    """Clinic-defined shift template: Morning 06:00–14:00, Night 22:00–06:00 etc."""
    __tablename__ = "shift_types"
    id         = Column(Integer, primary_key=True, index=True)
    clinic_id  = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    name       = Column(String(100), nullable=False)
    start_time = Column(String(5), nullable=False)   # "06:00"
    end_time   = Column(String(5), nullable=False)   # "14:00"
    color_hex  = Column(String(7), default="#0F2557")
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class StaffGroup(Base):
    """Manager-created group: 'ICU Nurses', 'OPD Doctors', 'Front Desk'."""
    __tablename__ = "staff_groups"
    id            = Column(Integer, primary_key=True, index=True)
    clinic_id     = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    name          = Column(String(200), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    manager_id    = Column(Integer, ForeignKey("staff.id"), nullable=True)  # owning manager
    created_at    = Column(DateTime, server_default=func.now())

    members = relationship("StaffGroupMember", back_populates="group", cascade="all, delete-orphan")


class StaffGroupMember(Base):
    __tablename__ = "staff_group_members"
    __table_args__ = (UniqueConstraint("group_id", "staff_id"),)
    id        = Column(Integer, primary_key=True, index=True)
    group_id  = Column(Integer, ForeignKey("staff_groups.id"), nullable=False)
    staff_id  = Column(Integer, ForeignKey("staff.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    group = relationship("StaffGroup", back_populates="members")
    staff = relationship("Staff", foreign_keys=[staff_id])


class ScheduleEntry(Base):
    """One staff member assigned one shift on one date."""
    __tablename__ = "schedule_entries"
    __table_args__ = (UniqueConstraint("staff_id", "work_date", "shift_type_id"),)
    id            = Column(Integer, primary_key=True, index=True)
    clinic_id     = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    group_id      = Column(Integer, ForeignKey("staff_groups.id"), nullable=True)
    staff_id      = Column(Integer, ForeignKey("staff.id"), nullable=False)
    shift_type_id = Column(Integer, ForeignKey("shift_types.id"), nullable=False)
    work_date     = Column(Date, nullable=False)
    status        = Column(String(20), default="draft")   # draft | published
    notes         = Column(String(300), nullable=True)
    created_by    = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_at    = Column(DateTime, server_default=func.now())
    updated_at    = Column(DateTime, server_default=func.now(), onupdate=func.now())

    shift_type = relationship("ShiftType", foreign_keys=[shift_type_id])
    staff      = relationship("Staff", foreign_keys=[staff_id])


class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    id            = Column(Integer, primary_key=True, index=True)
    clinic_id     = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    staff_id      = Column(Integer, ForeignKey("staff.id"), nullable=False)
    leave_type    = Column(String(20), default="casual")   # casual | sick | pto | earned
    from_date     = Column(Date, nullable=False)
    to_date       = Column(Date, nullable=False)
    reason        = Column(String(500), nullable=True)
    status        = Column(String(20), default="pending")  # pending | approved | rejected
    decided_by    = Column(Integer, ForeignKey("staff.id"), nullable=True)
    decided_at    = Column(DateTime, nullable=True)
    decision_note = Column(String(300), nullable=True)
    created_at    = Column(DateTime, server_default=func.now())

    staff = relationship("Staff", foreign_keys=[staff_id])


class SchedulePattern(Base):
    """Saved weekly template that can be re-applied to any week (weekly/monthly/permanent)."""
    __tablename__ = "schedule_patterns"
    id           = Column(Integer, primary_key=True, index=True)
    clinic_id    = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    group_id     = Column(Integer, ForeignKey("staff_groups.id"), nullable=True)
    name         = Column(String(200), nullable=False)
    recurrence   = Column(String(20), default="manual")   # manual | weekly | monthly | permanent
    pattern_data = Column(JSON, nullable=False, default=list)  # [{staff_id, weekday, shift_type_id}]
    created_by   = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_at   = Column(DateTime, server_default=func.now())


class SchedulePublishLog(Base):
    __tablename__ = "schedule_publish_logs"
    id           = Column(Integer, primary_key=True, index=True)
    clinic_id    = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    group_id     = Column(Integer, ForeignKey("staff_groups.id"), nullable=True)
    week_start   = Column(Date, nullable=False)
    week_end     = Column(Date, nullable=False)
    published_by = Column(Integer, ForeignKey("staff.id"), nullable=True)
    published_at = Column(DateTime, server_default=func.now())
    recipients   = Column(JSON, default=list)  # [{staff_id, name, email, sent}]


class SchedulerSettings(Base):
    """Per-clinic scheduling rules set up once by the manager."""
    __tablename__ = "scheduler_settings"
    id                  = Column(Integer, primary_key=True, index=True)
    clinic_id           = Column(Integer, ForeignKey("clinics.id"), unique=True, nullable=False)
    min_rest_hours      = Column(Integer, default=8)
    max_shifts_per_week = Column(Integer, default=6)
    weekly_off_day      = Column(String(10), nullable=True)   # e.g. "sunday"
    leave_quotas        = Column(JSON, default=dict)          # {"casual": 12, "sick": 10, "pto": 15, "earned": 15}
    setup_complete      = Column(Boolean, default=False)
    created_at          = Column(DateTime, server_default=func.now())
    updated_at          = Column(DateTime, server_default=func.now(), onupdate=func.now())


class InsuranceClaim(Base):
    __tablename__ = "insurance_claims"
    id                    = Column(Integer, primary_key=True, index=True)
    clinic_id             = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    invoice_id            = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    appointment_id        = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    patient_id            = Column(Integer, ForeignKey("patients.id"), nullable=False)
    scheme_category       = Column(String(30), nullable=False)   # central_govt|state_govt|esic|cghs|echs|private|other
    scheme_name           = Column(String(200), nullable=False)  # free text e.g. "Aarogya Sree"
    card_number           = Column(String(100), nullable=True)
    policy_holder_name    = Column(String(200), nullable=True)
    tpa_name              = Column(String(200), nullable=True)
    pre_auth_ref          = Column(String(100), nullable=True)
    pre_auth_amount       = Column(Numeric(10, 2), nullable=True)
    pre_auth_status       = Column(String(30), nullable=True)    # pending|approved|partial|rejected
    pre_auth_submitted_at = Column(DateTime, nullable=True)
    pre_auth_decided_at   = Column(DateTime, nullable=True)
    pre_auth_notes        = Column(Text, nullable=True)
    claim_ref             = Column(String(100), nullable=True)
    claimed_amount        = Column(Numeric(10, 2), nullable=True)
    approved_amount       = Column(Numeric(10, 2), nullable=True)
    claim_status          = Column(String(30), default="draft")  # draft|submitted|approved|partial|rejected|paid
    claim_submitted_at    = Column(DateTime, nullable=True)
    claim_decided_at      = Column(DateTime, nullable=True)
    claim_notes           = Column(Text, nullable=True)
    created_by            = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_at            = Column(DateTime, server_default=func.now())
    updated_at            = Column(DateTime, server_default=func.now(), onupdate=func.now())


class BillingOverrideRequest(Base):
    __tablename__ = "billing_override_requests"
    id             = Column(Integer, primary_key=True, index=True)
    clinic_id      = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    invoice_id     = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    patient_id     = Column(Integer, ForeignKey("patients.id"), nullable=False)
    from_module    = Column(String(50), nullable=False)   # pharmacy|lab|imaging|reception|doctor|other
    requested_by   = Column(Integer, ForeignKey("staff.id"), nullable=True)
    items          = Column(JSON, nullable=False)         # [{description, item_type, qty, unit_price, total}]
    total_amount   = Column(Numeric(10, 2), nullable=False)
    notes          = Column(Text, nullable=True)
    status         = Column(String(20), default="pending")  # pending|approved|rejected
    reviewed_by    = Column(Integer, ForeignKey("staff.id"), nullable=True)
    review_notes   = Column(Text, nullable=True)
    reviewed_at    = Column(DateTime, nullable=True)
    created_at     = Column(DateTime, server_default=func.now())


class InvoicePayment(Base):
    __tablename__ = "invoice_payments"
    id          = Column(Integer, primary_key=True, index=True)
    invoice_id  = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    clinic_id   = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    amount      = Column(Numeric(10, 2), nullable=False)
    method      = Column(String(50), nullable=False)   # cash|upi|card|cheque|neft|insurance|govt_scheme|other
    reference   = Column(String(200), nullable=True)   # UPI txn ID, card last 4, cheque no, etc.
    notes       = Column(Text, nullable=True)
    received_by = Column(Integer, ForeignKey("staff.id"), nullable=True)
    received_at = Column(DateTime, server_default=func.now())


class Feedback(Base):
    __tablename__ = "feedback"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(200), nullable=False)
    email      = Column(String(150), nullable=True)
    message    = Column(Text, nullable=False)
    type       = Column(String(50), nullable=True)
    is_read    = Column(Boolean, default=False, nullable=False, server_default="false")
    created_at = Column(DateTime, server_default=func.now())


class FormTemplate(Base):
    __tablename__ = "form_templates"
    id                 = Column(Integer, primary_key=True, index=True)
    clinic_id          = Column(Integer, ForeignKey("clinics.id", ondelete="CASCADE"), nullable=True)
    name               = Column(String(200), nullable=False)
    category           = Column(String(100), nullable=True)
    description        = Column(Text, nullable=True)
    schema             = Column(JSON, default=list)
    estimated_minutes  = Column(Integer, default=2)
    is_active          = Column(Boolean, default=True)
    is_global          = Column(Boolean, default=False)  # True = available to all clinics
    created_at         = Column(DateTime, server_default=func.now())
    updated_at         = Column(DateTime, server_default=func.now(), onupdate=func.now())


class FormResponse(Base):
    __tablename__ = "form_responses"
    id             = Column(Integer, primary_key=True, index=True)
    template_id    = Column(Integer, ForeignKey("form_templates.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=True)
    patient_id     = Column(Integer, ForeignKey("patients.id"), nullable=True)
    data           = Column(JSON, default=dict)
    filled_by      = Column(Integer, ForeignKey("staff.id"), nullable=True)
    filled_at      = Column(DateTime, server_default=func.now())
    updated_at     = Column(DateTime, server_default=func.now(), onupdate=func.now())


# ─── Assessment Forms (PowerForms) ───────────────────────────────────────────

class AssessmentForm(Base):
    __tablename__ = "assessment_forms"
    id                 = Column(Integer, primary_key=True, index=True)
    title              = Column(String(300), nullable=False)
    description        = Column(Text, nullable=True)
    category           = Column(String(100), default="general", index=True)
    subcategory        = Column(String(100), nullable=True)
    icon               = Column(String(100), nullable=True)
    schema             = Column(JSON, default=dict)
    scoring_config     = Column(JSON, nullable=True)
    iview_config       = Column(JSON, nullable=True)
    alert_rules        = Column(JSON, nullable=True)
    translations       = Column(JSON, nullable=True)
    status             = Column(String(20), default="draft", index=True)  # draft|published|retired
    version            = Column(Integer, default=1)
    is_template        = Column(Boolean, default=False)
    is_iview_enabled   = Column(Boolean, default=False)
    requires_cosign    = Column(Boolean, default=False)
    time_limit_minutes = Column(Integer, nullable=True)
    created_by         = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_by_admin   = Column(Integer, nullable=True)
    clinic_id          = Column(Integer, ForeignKey("clinics.id"), nullable=True)
    parent_form_id     = Column(Integer, nullable=True)
    published_at       = Column(DateTime, nullable=True)
    retired_at         = Column(DateTime, nullable=True)
    created_at         = Column(DateTime, server_default=func.now())
    updated_at         = Column(DateTime, server_default=func.now(), onupdate=func.now())


class AssessmentFormVersion(Base):
    __tablename__ = "assessment_form_versions"
    id             = Column(Integer, primary_key=True, index=True)
    form_id        = Column(Integer, ForeignKey("assessment_forms.id", ondelete="CASCADE"), nullable=False, index=True)
    version        = Column(Integer, nullable=False)
    schema         = Column(JSON, default=dict)
    scoring_config = Column(JSON, nullable=True)
    published_by   = Column(Integer, nullable=True)
    published_at   = Column(DateTime, nullable=True)
    created_at     = Column(DateTime, server_default=func.now())


class FormPool(Base):
    __tablename__ = "form_pool"
    id          = Column(Integer, primary_key=True, index=True)
    form_id     = Column(Integer, ForeignKey("assessment_forms.id", ondelete="CASCADE"), nullable=False, index=True)
    clinic_id   = Column(Integer, ForeignKey("clinics.id"), nullable=True, index=True)
    assigned_by = Column(Integer, nullable=True)
    assigned_at = Column(DateTime, server_default=func.now())
    is_active   = Column(Boolean, default=True)


class FormAssignment(Base):
    __tablename__ = "form_assignments"
    id               = Column(Integer, primary_key=True, index=True)
    form_id          = Column(Integer, ForeignKey("assessment_forms.id", ondelete="CASCADE"), nullable=False, index=True)
    form_version     = Column(Integer, default=1)
    clinic_id        = Column(Integer, ForeignKey("clinics.id"), nullable=False, index=True)
    patient_id       = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    appointment_id   = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    admission_id     = Column(Integer, nullable=True)
    assigned_by      = Column(Integer, nullable=False)
    assigned_to_role = Column(String(50), nullable=True)
    due_at           = Column(DateTime, nullable=True)
    status           = Column(String(20), default="pending", index=True)  # pending|completed|expired|cancelled
    priority         = Column(String(20), default="routine")
    notes            = Column(Text, nullable=True)
    assigned_at      = Column(DateTime, server_default=func.now())
    completed_at     = Column(DateTime, nullable=True)


class FormSubmission(Base):
    __tablename__ = "form_submissions"
    id             = Column(Integer, primary_key=True, index=True)
    form_id        = Column(Integer, ForeignKey("assessment_forms.id", ondelete="CASCADE"), nullable=False, index=True)
    form_version   = Column(Integer, default=1)
    assignment_id  = Column(Integer, ForeignKey("form_assignments.id", ondelete="SET NULL"), nullable=True)
    clinic_id      = Column(Integer, ForeignKey("clinics.id"), nullable=False, index=True)
    branch_id      = Column(Integer, ForeignKey("branches.id"), nullable=True)
    patient_id     = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    admission_id   = Column(Integer, nullable=True)
    encounter_id   = Column(String(24), nullable=True, index=True)  # unified encounter_no, e.g. HC00001-ENC-000123
    submitted_by   = Column(Integer, nullable=False)
    cosigned_by    = Column(Integer, nullable=True)
    cosigned_at    = Column(DateTime, nullable=True)
    data           = Column(JSON, default=dict)
    scores         = Column(JSON, nullable=True)
    alerts_fired   = Column(JSON, default=list)
    is_draft       = Column(Boolean, default=False)
    submitted_at   = Column(DateTime, nullable=True)
    charted_at     = Column(DateTime, nullable=True)
    source         = Column(String(30), default="provider")  # provider|patient|kiosk
    created_at     = Column(DateTime, server_default=func.now())


class FormAlert(Base):
    __tablename__ = "form_alerts"
    id              = Column(Integer, primary_key=True, index=True)
    submission_id   = Column(Integer, ForeignKey("form_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    clinic_id       = Column(Integer, ForeignKey("clinics.id"), nullable=False, index=True)
    patient_id      = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    field_id        = Column(String(100), nullable=True)
    field_label     = Column(String(200), nullable=True)
    value           = Column(String(200), nullable=True)
    severity        = Column(String(20), default="warning")  # critical|high|warning
    message         = Column(Text, nullable=True)
    notified_staff  = Column(JSON, default=list)
    acknowledged_by = Column(Integer, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, server_default=func.now())


class FormCoSign(Base):
    __tablename__ = "form_cosigns"
    id             = Column(Integer, primary_key=True, index=True)
    submission_id  = Column(Integer, ForeignKey("form_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    requested_by   = Column(Integer, nullable=False)
    requested_from = Column(Integer, nullable=False)
    status         = Column(String(20), default="pending")  # pending|approved|rejected
    note           = Column(Text, nullable=True)
    responded_at   = Column(DateTime, nullable=True)
    created_at     = Column(DateTime, server_default=func.now())


class iViewFlowsheet(Base):
    __tablename__ = "iview_flowsheets"
    id          = Column(Integer, primary_key=True, index=True)
    form_id     = Column(Integer, ForeignKey("assessment_forms.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    time_band   = Column(String(10), default="4h")  # 1h|2h|4h|8h|12h|24h
    row_config  = Column(JSON, nullable=True)
    created_at  = Column(DateTime, server_default=func.now())
    updated_at  = Column(DateTime, server_default=func.now(), onupdate=func.now())


class iViewObservation(Base):
    """One persisted flowsheet cell — a single field value captured from an
    iView-enabled form submission (the time-series the flowsheet renders).
    iview_flowsheets above is the per-form CONFIG; this is the per-observation data."""
    __tablename__ = "iview_observations"
    id            = Column(Integer, primary_key=True, index=True)
    clinic_id     = Column(Integer, ForeignKey("clinics.id"), nullable=True, index=True)
    form_id       = Column(Integer, ForeignKey("assessment_forms.id", ondelete="CASCADE"), nullable=False, index=True)
    submission_id = Column(Integer, ForeignKey("form_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id    = Column(Integer, nullable=True, index=True)
    encounter_id  = Column(String(24), nullable=True, index=True)
    field_id      = Column(String(100), nullable=False)
    label         = Column(String(200), nullable=True)
    value_text    = Column(Text, nullable=True)
    value_numeric = Column(Numeric(12, 3), nullable=True)
    unit          = Column(String(40), nullable=True)
    ref_range     = Column(Text, nullable=True)
    recorded_at   = Column(DateTime, nullable=True, index=True)
    created_at    = Column(DateTime, server_default=func.now())


class StaffFormFavorite(Base):
    """Favorite assessment forms. scope='personal' → visible only to that staff
    member; scope='organization' → visible to every staff member in the clinic
    (the health center, spanning all its branches). Always tenant-isolated by
    clinic_id, which is taken from the JWT, never the client."""
    __tablename__ = "staff_form_favorites"
    id         = Column(Integer, primary_key=True, index=True)
    clinic_id  = Column(Integer, ForeignKey("clinics.id"), nullable=False, index=True)
    staff_id   = Column(Integer, ForeignKey("staff.id"), nullable=False, index=True)
    form_id    = Column(Integer, ForeignKey("assessment_forms.id", ondelete="CASCADE"), nullable=False, index=True)
    scope      = Column(String(20), nullable=False, default="personal")  # personal | organization
    created_at = Column(DateTime, server_default=func.now())


# ─── Medical Terminology Library (dynamic — replaces all hardcoded disease/symptom lists) ───

class MedicalTerm(Base):
    __tablename__ = "medical_terms"
    id         = Column(Integer, primary_key=True, index=True)
    system     = Column(String(80), default="http://hl7.org/fhir/sid/icd-10")  # FHIR system URI
    code       = Column(String(20), nullable=True, index=True)                  # ICD-10 / SNOMED code
    display    = Column(String(300), nullable=False)
    category   = Column(String(30), default="condition")  # condition|symptom|allergy
    specialty  = Column(String(60), nullable=True, index=True)
    synonyms   = Column(Text, nullable=True)               # pipe-separated search aliases
    tier       = Column(String(20), default="curated")     # curated|reference (full ICD-10 dump)
    group_label = Column(String(60), nullable=True)        # for allergens: Antibiotic/Food/...
    clinic_id  = Column(Integer, ForeignKey("clinics.id"), nullable=True)  # NULL = platform-global
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class Drug(Base):
    __tablename__ = "drugs"
    id         = Column(Integer, primary_key=True, index=True)
    generic    = Column(String(200), nullable=False, index=True)
    atc        = Column(String(10), nullable=True, index=True)
    drug_class = Column(String(150), nullable=True)
    routes     = Column(String(150), nullable=True)   # pipe-separated
    brands     = Column(Text, nullable=True)          # pipe-separated Indian brands
    primary_brand = Column(String(100), nullable=True) # most-used Indian brand name
    rx_only      = Column(Boolean, default=True)
    clinic_id    = Column(Integer, ForeignKey("clinics.id"), nullable=True)
    is_active    = Column(Boolean, default=True)
    formulations = Column(Text, nullable=True)   # JSON array of {form, route, doses, unit}
    created_at   = Column(DateTime, server_default=func.now())


class DrugInteraction(Base):
    __tablename__ = "drug_interactions"
    id         = Column(Integer, primary_key=True, index=True)
    drug_a     = Column(String(200), nullable=False, index=True)
    drug_b     = Column(String(200), nullable=False, index=True)
    severity         = Column(String(20), nullable=False)   # contraindicated|serious|moderate
    interaction_type = Column(String(30), default="drug-drug")  # drug-drug|drug-food|drug-condition
    effect           = Column(Text, nullable=True)
    management       = Column(Text, nullable=True)
    created_at       = Column(DateTime, server_default=func.now())


class DrugDoseRange(Base):
    __tablename__ = "drug_dose_ranges"
    id                    = Column(Integer, primary_key=True, index=True)
    generic               = Column(String(200), nullable=False, index=True)
    route                 = Column(String(40), default="oral")
    population            = Column(String(20), default="adult")  # adult | pediatric | elderly
    max_single_mg         = Column(Numeric(12, 3), nullable=True)
    max_daily_mg          = Column(Numeric(12, 3), nullable=True)
    unit                  = Column(String(10), default="mg")
    note                  = Column(Text, nullable=True)
    pediatric_dose_mg_kg_min = Column(Numeric(10, 3), nullable=True)
    pediatric_dose_mg_kg_max = Column(Numeric(10, 3), nullable=True)
    renal_adjustment      = Column(Boolean, default=False)
    hepatic_adjustment    = Column(Boolean, default=False)
    pregnancy_category    = Column(String(5), nullable=True)
    created_at            = Column(DateTime, server_default=func.now())


class DrugContraindication(Base):
    __tablename__ = "drug_contraindications"
    id           = Column(Integer, primary_key=True, index=True)
    generic      = Column(String(200), nullable=False, index=True)
    icd10_prefix = Column(String(10), nullable=False, index=True)
    condition    = Column(String(200), nullable=True)
    severity     = Column(String(20), default="serious")  # contraindicated|serious
    reason       = Column(Text, nullable=True)
    created_at   = Column(DateTime, server_default=func.now())


class DrugCounselling(Base):
    __tablename__ = "drug_counselling"
    id         = Column(Integer, primary_key=True, index=True)
    generic    = Column(String(200), nullable=False, index=True)
    tip        = Column(Text, nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


class DrugPregnancyCategory(Base):
    __tablename__ = "pregnancy_categories"
    id         = Column(Integer, primary_key=True, index=True)
    generic    = Column(String(200), nullable=False, index=True)
    category   = Column(String(5), nullable=True)   # A, B, C, D, X
    schedule   = Column(String(10), nullable=True)  # H, H1, X (India)
    notes      = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class FoodDrugInteraction(Base):
    __tablename__ = "food_drug_interactions"
    id         = Column(Integer, primary_key=True, index=True)
    generic    = Column(String(200), nullable=False, index=True)
    food       = Column(Text, nullable=False)
    effect     = Column(Text, nullable=True)
    severity   = Column(String(20), default="moderate")  # major|moderate|minor
    created_at = Column(DateTime, server_default=func.now())


class ImagingCatalog(Base):
    __tablename__ = "imaging_catalog"
    id               = Column(Integer, primary_key=True, index=True)
    name             = Column(String(200), nullable=False)
    modality         = Column(String(20), nullable=False, index=True)
    body_part        = Column(String(100), nullable=True)
    category         = Column(String(100), nullable=True)
    turnaround_hours = Column(Integer, default=24)
    preparation      = Column(Text, nullable=True)
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime, server_default=func.now())


# ── Visitor Desk ───────────────────────────────────────────────────────────────

class VisitorPolicy(Base):
    __tablename__ = "visitor_policies"
    id               = Column(Integer, primary_key=True, index=True)
    clinic_id        = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    ward_id          = Column(Integer, ForeignKey("wards.id"), nullable=True)   # NULL = hospital-wide default
    visit_start      = Column(String(5), default="10:00")    # "HH:MM"
    visit_end        = Column(String(5), default="20:00")
    max_active       = Column(Integer, default=5)            # active passes per patient at a time
    max_persons      = Column(Integer, default=2)            # persons allowed per pass
    attender_allowed = Column(Boolean, default=True)
    lockdown         = Column(Boolean, default=False)        # full lockdown: no new passes
    updated_at       = Column(DateTime, server_default=func.now(), onupdate=func.now())


class VisitorPass(Base):
    __tablename__ = "visitor_passes"
    id              = Column(Integer, primary_key=True, index=True)
    clinic_id       = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    pass_code       = Column(String(12), unique=True, nullable=False, index=True)
    pass_type       = Column(String(10), default="visit")    # visit | attender
    admission_id    = Column(Integer, ForeignKey("admissions.id"), nullable=False)
    patient_id      = Column(Integer, ForeignKey("patients.id"), nullable=False)
    visitor_name    = Column(String(200), nullable=False)
    relation        = Column(String(50), nullable=True)
    visitor_mobile  = Column(String(20), nullable=True)
    id_proof_type   = Column(String(50), nullable=True)
    id_proof_number = Column(String(100), nullable=True)
    persons         = Column(Integer, default=1)
    valid_from      = Column(DateTime, nullable=False)
    valid_until     = Column(DateTime, nullable=False)
    status          = Column(String(20), default="active")   # active|checked_in|checked_out|revoked
    checked_in_at   = Column(DateTime, nullable=True)
    checked_out_at  = Column(DateTime, nullable=True)
    note            = Column(Text, nullable=True)
    issued_by       = Column(Integer, ForeignKey("staff.id"), nullable=True)
    revoked_by      = Column(Integer, ForeignKey("staff.id"), nullable=True)
    revoke_reason   = Column(String(300), nullable=True)
    override_note   = Column(String(300), nullable=True)
    print_count     = Column(Integer, default=0)
    edit_log        = Column(JSON, default=list)
    created_at      = Column(DateTime, server_default=func.now())

    admission = relationship("Admission", foreign_keys=[admission_id])
    patient   = relationship("Patient", foreign_keys=[patient_id])
    issuer    = relationship("Staff", foreign_keys=[issued_by])


class DiseaseCounselling(Base):
    __tablename__ = "disease_counselling"
    id           = Column(Integer, primary_key=True, index=True)
    icd10_prefix = Column(String(10), nullable=False, index=True)
    condition    = Column(String(200), nullable=True)
    tip          = Column(Text, nullable=False)
    sort_order   = Column(Integer, default=0)
    created_at   = Column(DateTime, server_default=func.now())


class SubscriptionPayment(Base):
    __tablename__ = "subscription_payments"
    id          = Column(Integer, primary_key=True, index=True)
    clinic_id   = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    amount      = Column(Numeric(12, 2), nullable=False)
    method      = Column(String(20), nullable=False, default="cash")
    reference   = Column(String(200), nullable=True)
    notes       = Column(Text, nullable=True)
    period_from = Column(Date, nullable=True)
    period_to   = Column(Date, nullable=True)
    recorded_by = Column(Integer, nullable=True)
    created_at  = Column(DateTime, server_default=func.now())


class StockAdjustment(Base):
    __tablename__ = "stock_adjustments"
    id              = Column(Integer, primary_key=True, index=True)
    clinic_id       = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id       = Column(Integer, ForeignKey("branches.id"), nullable=True)
    medicine_id     = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    batch_id        = Column(Integer, ForeignKey("medicine_batches.id"), nullable=True)
    adjustment_type = Column(String(30), nullable=False)
    quantity_before = Column(Integer, nullable=False)
    quantity_change = Column(Integer, nullable=False)
    quantity_after  = Column(Integer, nullable=False)
    reason          = Column(String(100), nullable=False)
    notes           = Column(Text, nullable=True)
    performed_by    = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_at      = Column(DateTime, server_default=func.now())

    medicine = relationship("Medicine")


class CashReconciliation(Base):
    __tablename__ = "cash_reconciliations"
    id             = Column(Integer, primary_key=True, index=True)
    clinic_id      = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id      = Column(Integer, ForeignKey("branches.id"), nullable=True)
    shift_date     = Column(Date, nullable=False)
    shift          = Column(String(20), default="day")
    opening_cash   = Column(Numeric(10, 2), default=0)
    expected_cash  = Column(Numeric(10, 2), default=0)
    actual_cash    = Column(Numeric(10, 2), default=0)
    cash_sales     = Column(Numeric(10, 2), default=0)
    card_sales     = Column(Numeric(10, 2), default=0)
    upi_sales      = Column(Numeric(10, 2), default=0)
    credit_sales   = Column(Numeric(10, 2), default=0)
    total_returns  = Column(Numeric(10, 2), default=0)
    difference     = Column(Numeric(10, 2), default=0)
    status         = Column(String(20), default="open")
    notes          = Column(Text, nullable=True)
    closed_by      = Column(Integer, ForeignKey("staff.id"), nullable=True)
    closed_at      = Column(DateTime, nullable=True)
    created_at     = Column(DateTime, server_default=func.now())


class SupplierPayment(Base):
    __tablename__ = "supplier_payments"
    id                 = Column(Integer, primary_key=True, index=True)
    clinic_id          = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    supplier_id        = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    purchase_order_id  = Column(Integer, ForeignKey("purchase_orders.id"), nullable=True)
    amount             = Column(Numeric(10, 2), nullable=False)
    payment_date       = Column(Date, nullable=False)
    payment_mode       = Column(String(30), nullable=True)
    reference_number   = Column(String(100), nullable=True)
    notes              = Column(Text, nullable=True)
    created_by         = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_at         = Column(DateTime, server_default=func.now())

    supplier       = relationship("Supplier")
    purchase_order = relationship("PurchaseOrder", foreign_keys=[purchase_order_id])


class DiscountScheme(Base):
    __tablename__ = "discount_schemes"
    id             = Column(Integer, primary_key=True, index=True)
    clinic_id      = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    name           = Column(String(100), nullable=False)
    scheme_type    = Column(String(30), default="percentage")
    discount_value = Column(Numeric(5, 2), nullable=False)
    applies_to     = Column(String(20), default="all")
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime, server_default=func.now())


class CreditAccount(Base):
    __tablename__ = "credit_accounts"
    id                  = Column(Integer, primary_key=True, index=True)
    clinic_id           = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    customer_name       = Column(String(200), nullable=False)
    customer_mobile     = Column(String(20), nullable=True)
    credit_limit        = Column(Numeric(10, 2), default=5000)
    outstanding_balance = Column(Numeric(10, 2), default=0)
    is_active           = Column(Boolean, default=True)
    created_at          = Column(DateTime, server_default=func.now())

    transactions = relationship("CreditTransaction", back_populates="account")


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"
    id                 = Column(Integer, primary_key=True, index=True)
    clinic_id          = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    credit_account_id  = Column(Integer, ForeignKey("credit_accounts.id"), nullable=False)
    invoice_id         = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    transaction_type   = Column(String(20), nullable=False)
    amount             = Column(Numeric(10, 2), nullable=False)
    balance_after      = Column(Numeric(10, 2), nullable=False)
    notes              = Column(Text, nullable=True)
    created_by         = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_at         = Column(DateTime, server_default=func.now())

    account = relationship("CreditAccount", back_populates="transactions")


class SupplierReturn(Base):
    __tablename__ = "supplier_returns"
    id                 = Column(Integer, primary_key=True, index=True)
    clinic_id          = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    supplier_id        = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    purchase_order_id  = Column(Integer, ForeignKey("purchase_orders.id"), nullable=True)
    return_date        = Column(Date, nullable=False)
    reason             = Column(String(100), nullable=False)
    status             = Column(String(20), default="pending")
    notes              = Column(Text, nullable=True)
    created_by         = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_at         = Column(DateTime, server_default=func.now())

    supplier = relationship("Supplier")
    items    = relationship("SupplierReturnItem", back_populates="supplier_return")


class SupplierReturnItem(Base):
    __tablename__ = "supplier_return_items"
    id              = Column(Integer, primary_key=True, index=True)
    return_id       = Column(Integer, ForeignKey("supplier_returns.id"), nullable=False)
    medicine_id     = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    batch_number    = Column(String(50), nullable=True)
    quantity        = Column(Integer, nullable=False)
    unit_cost       = Column(Numeric(10, 2), nullable=True)
    total_value     = Column(Numeric(10, 2), nullable=True)

    supplier_return = relationship("SupplierReturn", back_populates="items")


# ── Pharmacy Shared Cart ───────────────────────────────────────────────────────

class PharmacyCartItem(Base):
    """Shared, persistent dispensing cart scoped per clinic+branch.
    All pharmacists at the same branch see the same cart.
    Adding = physically prepared. Dispensing removes from cart for everyone."""
    __tablename__ = "pharmacy_cart_items"
    id             = Column(Integer, primary_key=True, index=True)
    clinic_id      = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    branch_id      = Column(Integer, ForeignKey("branches.id"), nullable=True)
    source_type    = Column(String(20), nullable=False)  # prescription_item | medication_order
    source_id      = Column(Integer, nullable=False)
    patient_id     = Column(Integer, ForeignKey("patients.id"), nullable=True)
    admission_id   = Column(Integer, ForeignKey("admissions.id"), nullable=True)
    encounter_type = Column(String(2), default="OP")   # OP | IP
    medicine_name  = Column(String(200), nullable=False)
    generic_name   = Column(String(200), nullable=True)
    dose           = Column(String(100), nullable=True)
    route          = Column(String(50), nullable=True)
    frequency      = Column(String(100), nullable=True)
    duration       = Column(String(100), nullable=True)
    quantity       = Column(Integer, default=1)
    instructions   = Column(Text, nullable=True)
    is_stat        = Column(Boolean, default=False)
    medicine_id    = Column(Integer, ForeignKey("medicines.id"), nullable=True)
    added_by       = Column(Integer, ForeignKey("staff.id"), nullable=True)
    added_at       = Column(DateTime, server_default=func.now())

    patient = relationship("Patient", foreign_keys=[patient_id])
    adder   = relationship("Staff", foreign_keys=[added_by])
    medicine        = relationship("Medicine")


# ── Subscription / Billing (platform-level plans) ─────────────────────────────

class Plan(Base):
    """Subscription plan template — à-la-carte app modules bundled into a named
    plan. Authoritative source for plan definitions; the legacy plan_config JSON
    in platform_settings is kept only for the existing admin editor."""
    __tablename__ = "plans"
    id                     = Column(Integer, primary_key=True, index=True)
    key                    = Column(String(40), unique=True, nullable=False)   # provider | clinic | hospital | free
    name                   = Column(String(80), nullable=False)
    description            = Column(Text, nullable=True)
    color                  = Column(String(20), nullable=True)
    currency               = Column(String(8), default="INR")
    monthly_price          = Column(Numeric(12, 2), default=0)
    annual_price           = Column(Numeric(12, 2), default=0)
    monthly_price_per_seat = Column(Numeric(12, 2), default=0)
    annual_price_per_seat  = Column(Numeric(12, 2), default=0)
    modules                = Column(JSON, nullable=False, default=dict)   # {"provider": true, "pharmacy": false, ...}
    limits                 = Column(JSON, nullable=False, default=dict)   # {"max_doctors": 5, "max_staff": 20, ...}
    features               = Column(JSON, nullable=True)                  # display bullet list
    is_public              = Column(Boolean, default=True)
    is_active              = Column(Boolean, default=True)
    sort_order             = Column(Integer, default=0)
    version                = Column(Integer, default=1)
    created_at             = Column(DateTime, server_default=func.now())
    updated_at             = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ClinicSubscription(Base):
    """Current subscription for a health center (one active row per clinic).
    Carries a price + entitlement snapshot so editing a Plan never silently
    re-prices or re-scopes existing subscribers (grandfathering)."""
    __tablename__ = "clinic_subscriptions"
    id                    = Column(Integer, primary_key=True, index=True)
    clinic_id             = Column(Integer, ForeignKey("clinics.id"), unique=True, nullable=False)
    plan_id               = Column(Integer, ForeignKey("plans.id"), nullable=True)
    plan_key              = Column(String(40), nullable=True)
    status                = Column(String(20), default="active")   # active|grace|expired|suspended|comped|cancelled|pending
    billing_cycle         = Column(String(12), default="monthly")  # monthly|annual
    seats                 = Column(Integer, default=0)
    price_snapshot        = Column(Numeric(12, 2), default=0)
    entitlements_snapshot = Column(JSON, nullable=True)            # {"modules": {...}, "limits": {...}}
    current_period_start  = Column(Date, nullable=True)
    current_period_end    = Column(Date, nullable=True)
    grace_until           = Column(Date, nullable=True)
    auto_renew            = Column(Boolean, default=True)
    cancel_at             = Column(Date, nullable=True)
    is_waived             = Column(Boolean, default=False)
    waived_reason         = Column(Text, nullable=True)
    waived_by             = Column(Integer, nullable=True)         # platform_admin id
    waived_until          = Column(Date, nullable=True)
    created_at            = Column(DateTime, server_default=func.now())
    updated_at            = Column(DateTime, server_default=func.now(), onupdate=func.now())


class SubscriptionInvoice(Base):
    """A bill for a subscription period. Paid online (Razorpay) or by bank
    transfer (reference confirmed by the platform). Amounts are computed
    server-side from the plan — never trusted from the client."""
    __tablename__ = "subscription_invoices"
    id                 = Column(Integer, primary_key=True, index=True)
    clinic_id          = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    plan_id            = Column(Integer, ForeignKey("plans.id"), nullable=True)
    plan_key           = Column(String(40), nullable=True)
    billing_cycle      = Column(String(12), default="monthly")
    seats              = Column(Integer, default=0)
    amount             = Column(Numeric(12, 2), nullable=False)
    currency           = Column(String(8), default="INR")
    status             = Column(String(20), default="pending")   # pending|paid|failed|cancelled|pending_verification
    method             = Column(String(20), nullable=True)        # razorpay|bank_transfer
    gateway_order_id   = Column(String(120), nullable=True)
    gateway_payment_id = Column(String(120), nullable=True)
    reference          = Column(String(200), nullable=True)
    period_from        = Column(Date, nullable=True)
    period_to          = Column(Date, nullable=True)
    notes              = Column(Text, nullable=True)
    created_by         = Column(Integer, nullable=True)
    paid_at            = Column(DateTime, nullable=True)
    created_at         = Column(DateTime, server_default=func.now())


class WebhookEvent(Base):
    """Idempotency + audit log for inbound payment-gateway webhooks."""
    __tablename__ = "webhook_events"
    id         = Column(Integer, primary_key=True, index=True)
    provider   = Column(String(20), default="razorpay")
    event_id   = Column(String(120), unique=True, nullable=True)
    event_type = Column(String(60), nullable=True)
    payload    = Column(JSON, nullable=True)
    processed  = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())


class NotificationLog(Base):
    """Audit + idempotency for billing notifications (email/SMS). A unique
    dedup_key guarantees a reminder/receipt is never sent twice."""
    __tablename__ = "notification_log"
    id         = Column(Integer, primary_key=True, index=True)
    clinic_id  = Column(Integer, ForeignKey("clinics.id"), nullable=True)
    kind       = Column(String(40), nullable=True)     # renewal_7 | grace | suspended | receipt | ...
    channel    = Column(String(10), nullable=True)     # email | sms
    dedup_key  = Column(String(180), unique=True, nullable=True)
    recipient  = Column(String(200), nullable=True)
    subject    = Column(String(200), nullable=True)
    status     = Column(String(20), default="sent")    # sent | failed
    created_at = Column(DateTime, server_default=func.now())
