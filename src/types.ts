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
  /** No longer collected. Retained so records created earlier still load. */
  category?: EquipmentCategory;
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  /** Optional. Not every device carries a hospital asset code. */
  assetNumber?: string;
  ward: string;
  status: EquipmentStatus;
  /** No longer collected. Retained so records created earlier still load. */
  purchaseDate?: string;
  /**
   * Electrical rating from the device nameplate, recorded as written, e.g.
   * "230 V / 50 Hz, 1500 W" or "120 kVp, 500 mA". Free text because ratings are
   * quoted in W, kW, VA or kVA depending on the device.
   *
   * Required when registering a device. Optional on the type because records
   * created before this field existed do not carry one.
   */
  powerRating?: string;
  /** No longer collected. Retained so records created earlier still load. */
  installationDate?: string;
  /** No longer collected. Retained so records created earlier still load. */
  warrantyExpiryDate?: string;
  photoUrl?: string;
  qrCodeData?: string;
  createdAt: string;
  /** Set when an administrator last amended the record. */
  updatedAt?: string;
  /** Email of the administrator who last amended the record. */
  updatedBy?: string;
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

export type NotificationType = 'assignment';

export interface AppNotification {
  id: string;
  /** Lowercased email of the staff member this is addressed to. */
  recipientEmail: string;
  type: NotificationType;
  title: string;
  message: string;
  equipmentId?: string;
  equipmentName?: string;
  scheduleId?: string;
  dueDate?: string;
  /** Name of the staff member who created the assignment. */
  createdByName?: string;
  read: boolean;
  createdAt: string;
  /** Set once an email has been enqueued for this notification. */
  emailQueuedAt?: string;
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
