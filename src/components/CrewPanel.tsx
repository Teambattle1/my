import { Star, Phone, User } from 'lucide-react';
import type { CrewAssignment } from '@/types';

interface CrewPanelProps {
  crew: CrewAssignment[];
  currentEmployeeId: string | null;
  isLead: boolean;
}

export default function CrewPanel({ crew, currentEmployeeId, isLead }: CrewPanelProps) {
  if (crew.length === 0) return null;

  // Sort: leads first, then current user, then others
  const sorted = [...crew].sort((a, b) => {
    const aLead = a.role === 'lead' || a.role === 'teamlead' ? 0 : 1;
    const bLead = b.role === 'lead' || b.role === 'teamlead' ? 0 : 1;
    if (aLead !== bLead) return aLead - bLead;
    const aMe = a.employee_id === currentEmployeeId ? 0 : 1;
    const bMe = b.employee_id === currentEmployeeId ? 0 : 1;
    return aMe - bMe;
  });

  return (
    <div style={{
      border: '1px solid #d1d5db',
      borderRadius: '3px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: '#dbeafe',
        padding: '3px 8px',
        borderBottom: '1px solid #93c5fd',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#1e40af' }}>
          Dit team
        </span>
        {isLead && (
          <span style={{
            fontSize: '7pt',
            fontWeight: 800,
            color: '#fff',
            background: '#ea580c',
            padding: '1px 6px',
            borderRadius: '3px',
            letterSpacing: '0.1em',
          }}>
            DU ER LEAD
          </span>
        )}
      </div>

      {/* Crew list */}
      <div style={{ padding: '6px 8px', background: '#fff' }}>
        {sorted.map((member, i) => {
          const isMe = member.employee_id === currentEmployeeId;
          const isMemberLead = member.role === 'lead' || member.role === 'teamlead';

          return (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 4px',
              marginBottom: '2px',
              borderRadius: '3px',
              background: isMe ? '#fef3c7' : 'transparent',
            }}>
              {isMemberLead ? (
                <Star size={12} color="#ea580c" fill="#ea580c" style={{ flexShrink: 0 }} />
              ) : (
                <User size={12} color="#94a3b8" style={{ flexShrink: 0 }} />
              )}
              <span style={{
                fontSize: '9pt',
                fontWeight: isMe || isMemberLead ? 700 : 400,
                color: isMemberLead ? '#ea580c' : '#1f2937',
                flex: 1,
              }}>
                {member.employee_name}
                {isMe && <span style={{ color: '#a16207', fontWeight: 400, fontSize: '8pt' }}> (dig)</span>}
              </span>
              <span style={{
                fontSize: '7pt',
                color: '#6b7280',
                textTransform: 'uppercase',
                background: isMemberLead ? '#ffedd5' : '#f1f5f9',
                padding: '1px 5px',
                borderRadius: '2px',
                flexShrink: 0,
              }}>
                {member.role}
              </span>
              {member.employee_phone && (
                <span style={{ fontSize: '8pt', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                  <Phone size={9} /> {member.employee_phone}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
