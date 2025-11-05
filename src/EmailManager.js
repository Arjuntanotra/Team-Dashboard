import React, { useState, useEffect } from 'react';
import { Mail, Send, User, AlertCircle, CheckCircle, Settings, MessageSquare } from 'lucide-react';

const EmailManager = ({ selectedManager, teamData }) => {
  const [emails, setEmails] = useState({});
  const [manualEmail, setManualEmail] = useState({ teamMember: '', project: '', customMessage: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('manage');

  // Backend URL
  const BACKEND_URL = 'http://localhost:5000';

  // Load existing emails for team members
  useEffect(() => {
    if (teamData && teamData.length > 0) {
      teamData.forEach(member => {
        fetchEmailForMember(member.name);
      });
    }
  }, [teamData]);

  const fetchEmailForMember = async (memberName) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/team-member/${encodeURIComponent(memberName)}/email`);
      if (response.ok) {
        const data = await response.json();
        setEmails(prev => ({ ...prev, [memberName]: data.email }));
      }
    } catch (error) {
      // Email not set yet, that's okay
    }
  };

  const updateEmailForMember = async (memberName, email) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/team-member/${encodeURIComponent(memberName)}/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmails(prev => ({ ...prev, [memberName]: email }));
        setMessage(`Email updated for ${memberName}`);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || 'Failed to update email');
      }
    } catch (error) {
      setMessage('Failed to update email');
    }
  };



  const sendManualReminder = async (memberName, projectName) => {
    // Find project deadline
    const memberTasks = teamData.find(m => m.name === memberName)?.projectsMap?.[projectName]?.tasks || [];
    const upcomingTask = memberTasks.find(task => {
      if (!task.deadline || task.deadline === 'N/A') return false;
      const deadline = new Date(task.deadline.split('/').reverse().join('-'));
      const today = new Date();
      const daysUntil = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 7;
    });

    if (!upcomingTask) {
      setMessage('No upcoming deadlines found for this project');
      return;
    }

    const deadline = new Date(upcomingTask.deadline.split('/').reverse().join('-'));
    const today = new Date();
    const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/send-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamMember: memberName,
          project: projectName,
          deadline: upcomingTask.deadline,
          daysUntilDeadline,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Reminder sent to ${memberName} for ${projectName}`);
      } else {
        setMessage(data.error || 'Failed to send reminder');
      }
    } catch (error) {
      setMessage('Failed to send reminder');
    }
    setLoading(false);
  };

  const sendManualEmail = async () => {
    if (!manualEmail.teamMember || !manualEmail.project) {
      setMessage('Please select a team member and project');
      return;
    }

    if (!emails[manualEmail.teamMember]) {
      setMessage('No email configured for this team member');
      return;
    }

    // Find project deadline
    const memberTasks = teamData.find(m => m.name === manualEmail.teamMember)?.projectsMap?.[manualEmail.project]?.tasks || [];
    const projectTask = memberTasks.find(task => !task.status?.toLowerCase().includes('complete'));

    if (!projectTask || !projectTask.deadline || projectTask.deadline === 'N/A') {
      setMessage('No active deadline found for this project');
      return;
    }

    const deadline = new Date(projectTask.deadline.split('/').reverse().join('-'));
    const today = new Date();
    const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    // Show warning if deadline has passed, but still allow sending
    if (daysUntilDeadline < 0) {
      const confirmSend = window.confirm(`⚠️ WARNING: The project deadline has already passed (${Math.abs(daysUntilDeadline)} days ago).\n\nDo you still want to send this reminder email?`);
      if (!confirmSend) {
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/send-manual-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamMember: manualEmail.teamMember,
          project: manualEmail.project,
          deadline: projectTask.deadline,
          daysUntilDeadline,
          customMessage: manualEmail.customMessage.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Manual reminder sent to ${manualEmail.teamMember} for ${manualEmail.project}`);
        setManualEmail({ teamMember: '', project: '', customMessage: '' });
      } else {
        setMessage(data.error || 'Failed to send manual reminder');
      }
    } catch (error) {
      setMessage('Failed to send manual reminder');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
          <Mail className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Email Management</h2>
          <p className="text-slate-600">Configure emails and send reminders</p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.includes('success') || message.includes('updated') || message.includes('sent') ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-4 py-2 font-medium ${activeTab === 'manage' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Settings className="w-4 h-4 inline mr-2" />
          Manage Emails
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2 font-medium ${activeTab === 'manual' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Manual Email
        </button>
      </div>

      {/* Manage Emails Tab */}
      {activeTab === 'manage' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
              <AlertCircle className="w-5 h-5" />
              Setup Required
            </div>
            <p className="text-blue-700 text-sm mb-3">
              Configure email addresses for team members to enable reminder functionality.
            </p>
            <div className="text-xs text-blue-600 space-y-1">
              <p>• Automated reminders run daily at 9 AM</p>
              <p>• Reminders sent 7, 3, and 1 day before deadlines</p>
              <p>• Only sent for incomplete tasks with valid deadlines</p>
            </div>
          </div>

          {teamData && teamData.map((member, idx) => (
            <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{member.name}</h4>
                    <p className="text-sm text-slate-500">{member.role}</p>
                  </div>
                </div>
                {emails[member.name] ? (
                  <div className="text-green-600">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Email configured</span>
                    </div>
                    <div className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                      {emails[member.name]}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Email needed</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <input
                  type="email"
                  placeholder="Enter email address"
                  defaultValue={emails[member.name] || ''}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const email = e.target.value.trim();
                      if (email) {
                        updateEmailForMember(member.name, email);
                      }
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const input = e.target.previousElementSibling;
                    const email = input.value.trim();
                    if (email) {
                      updateEmailForMember(member.name, email);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Update
                </button>
              </div>

              {/* Quick reminder buttons for projects with upcoming deadlines */}
              {member.projectsMap && Object.keys(member.projectsMap).map(projectName => {
                const tasks = member.projectsMap[projectName].tasks;
                const hasUpcomingDeadline = tasks.some(task => {
                  if (!task.deadline || task.deadline === 'N/A') return false;
                  const deadline = new Date(task.deadline.split('/').reverse().join('-'));
                  const today = new Date();
                  const daysUntil = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
                  return daysUntil > 0 && daysUntil <= 7 && !task.status?.toLowerCase().includes('complete');
                });

                if (hasUpcomingDeadline && emails[member.name]) {
                  return (
                    <button
                      key={projectName}
                      onClick={() => sendManualReminder(member.name, projectName)}
                      disabled={loading}
                      className="mt-2 mr-2 px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-800 text-sm rounded-full transition-colors disabled:opacity-50"
                    >
                      Send reminder for {projectName}
                    </button>
                  );
                }
                return null;
              })}
            </div>
          ))}
        </div>
      )}

      {/* Manual Email Tab */}
      {activeTab === 'manual' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
              <MessageSquare className="w-5 h-5" />
              Manual Email Sending
            </div>
            <p className="text-green-700 text-sm">
              Send personalized reminder emails to team members with custom messages.
            </p>
          </div>

          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Send Manual Reminder</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Team Member:</label>
                  <select
                    value={manualEmail.teamMember}
                    onChange={(e) => {
                      setManualEmail(prev => ({
                        ...prev,
                        teamMember: e.target.value,
                        project: '' // Reset project when member changes
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a team member</option>
                    {teamData && teamData.map((member, idx) => (
                      <option key={idx} value={member.name}>{member.name} ({member.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project:</label>
                  <select
                    value={manualEmail.project}
                    onChange={(e) => setManualEmail(prev => ({ ...prev, project: e.target.value }))}
                    disabled={!manualEmail.teamMember}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select a project</option>
                    {manualEmail.teamMember && teamData && (() => {
                      const member = teamData.find(m => m.name === manualEmail.teamMember);
                      if (member && member.projectsMap) {
                        return Object.keys(member.projectsMap).map((projectName, idx) => (
                          <option key={idx} value={projectName}>{projectName}</option>
                        ));
                      }
                      return null;
                    })()}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Custom Message (Optional):</label>
                <textarea
                  value={manualEmail.customMessage}
                  onChange={(e) => setManualEmail(prev => ({ ...prev, customMessage: e.target.value }))}
                  placeholder="Add a personal message to the team member..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {manualEmail.teamMember && manualEmail.project && (() => {
                const member = teamData.find(m => m.name === manualEmail.teamMember);
                const projectTasks = member?.projectsMap?.[manualEmail.project]?.tasks || [];
                const activeTask = projectTasks.find(task => !task.status?.toLowerCase().includes('complete'));

                if (activeTask && activeTask.deadline && activeTask.deadline !== 'N/A') {
                  const deadline = new Date(activeTask.deadline.split('/').reverse().join('-'));
                  const today = new Date();
                  const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

                  const isOverdue = daysUntilDeadline < 0;

                  return (
                    <div className={`${isOverdue ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4`}>
                      <h4 className={`text-sm font-semibold mb-2 ${isOverdue ? 'text-red-800' : 'text-blue-800'}`}>
                        Project Details:
                        {isOverdue && <span className="ml-2 text-red-600 font-bold">⚠️ OVERDUE</span>}
                      </h4>
                      <div className={`text-sm space-y-1 ${isOverdue ? 'text-red-700' : 'text-blue-700'}`}>
                        <p><strong>Deadline:</strong> {activeTask.deadline}</p>
                        <p><strong>Days Remaining:</strong> {daysUntilDeadline < 0 ? `${Math.abs(daysUntilDeadline)} days overdue` : daysUntilDeadline}</p>
                        <p><strong>Status:</strong> {isOverdue ? 'Overdue' : daysUntilDeadline <= 3 ? 'Urgent' : daysUntilDeadline <= 7 ? 'Upcoming' : 'Future'}</p>
                        {isOverdue && (
                          <p className="text-red-600 font-semibold mt-2">
                            ⚠️ This project deadline has already passed. You can still send a reminder email if needed.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <button
                onClick={sendManualEmail}
                disabled={loading || !manualEmail.teamMember || !manualEmail.project}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                {loading ? 'Sending...' : 'Send Manual Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default EmailManager;
