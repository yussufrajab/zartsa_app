export type ComplaintCategory =
  | 'reckless_driving'
  | 'overcharging'
  | 'harassment'
  | 'poor_vehicle_condition'
  | 'route_cutting'
  | 'operating_without_license';

export type ComplaintStatus = 'RECEIVED' | 'UNDER_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';

export interface Complaint {
  id: string;
  referenceNumber: string;
  userId: string | null;
  vehiclePlate: string;
  route: string;
  incidentDate: string;
  category: ComplaintCategory;
  description: string;
  attachments: string[];
  status: ComplaintStatus;
  assignedTo: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

