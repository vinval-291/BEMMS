export type EquipmentStatus = 'Active' | 'Under Repair' | 'Decommissioned' | 'Awaiting Spare Parts';

export type EquipmentCategory =
  | 'Ventilator'
  | 'Defibrillator'
  | 'ECG Machine'
  | 'Ultrasound Machine'
  | 'X-Ray Machine'
  | 'Patient Monitor'
  | 'Infusion Pump'
  | 'Syringe Pump'
  | 'Autoclave'
  | 'Laboratory Equipment'
  | 'Other';

export interface Equipment {
  id: string; // Document ID (Equipment ID)
  name: string;
  category: EquipmentCategory;
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  assetNumber: string;
  ward: string;
  installationDate: string;
  purchaseDate: string;
  warrantyExpiryDate: string;
  status: EquipmentStatus;
  photoUrl?: string;
  qrCodeData?: string;
  createdAt: string;
}

export type MaintenanceType =
  | 'Corrective Maintenance'
  | 'Preventive Maintenance'
  | 'Calibration'
  | 'Installation'
  | 'Inspection'
  | 'Upgrade';

export type JobStatus = 'Pending' | 'In Progress' | 'Completed' | 'Awaiting Spare Parts';

export interface SignatureDetails {
  name: string;
  designation: string;
  signature: string; // Data URL matching base64 canvas drawings
  department?: string; // only for user confirmation
}

export interface Job {
  id: string; // Job Number
  date: string;
  time: string;
  ward: string;
  equipmentName: string;
  equipmentId: string;
  modelNumber: string;
  serialNumber: string;
  faultReported: string;
  technicalWorkDone: string;
  rootCauseAnalysis: string;
  sparePartsUsed: string;
  maintenanceType: MaintenanceType;
  jobStatus: JobStatus;
  engineerDetails: SignatureDetails;
  userConfirmation: Required<SignatureDetails>;
  beforeRepairPhoto?: string;
  afterRepairPhoto?: string;
  serviceReportPdfUrl?: string; // PDF reference or mockup link
  createdAt: string;
}

export type ScheduleFrequency = 'monthly' | 'quarterly' | 'semi-annually' | 'annually';
export type ScheduleStatus = 'pending' | 'completed' | 'overdue';

export interface Schedule {
  id: string;
  equipmentId: string;
  equipmentName: string;
  nextMaintenanceDate: string;
  frequency: ScheduleFrequency;
  assignedEngineerId: string;
  assignedEngineerName: string;
  status: ScheduleStatus;
  createdAt: string;
}

export type UserRole = 'engineer' | 'head' | 'admin';

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  fullName?: string; // Bridged support for full name
  role: UserRole;
  designation: string;
  department?: string;
  createdAt?: string;
  active?: boolean; // Access status activation flag
  createdBy?: string; // UID of the registering Admin/HOD
  updatedAt?: string; // Auto-updated timestamp
}
