import { getAccessToken, loginWithGoogle } from '../firebase';
import { Signal, EconomicEvent } from '../types';

export const requireWorkspaceToken = async () => {
  let token = await getAccessToken();
  if (!token) {
    const result = await loginWithGoogle();
    if (result && result.accessToken) {
      token = result.accessToken;
    } else {
      throw new Error('Failed to obtain Workspace access token.');
    }
  }
  return token;
};

export const exportToGoogleSheets = async (signals: Signal[]) => {
  const token = await requireWorkspaceToken();

  // Create a new spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: `Cosmic Trading Log - ${new Date().toISOString().split('T')[0]}` },
    }),
  });

  if (!createRes.ok) throw new Error('Failed to create spreadsheet.');
  const sheet = await createRes.json();
  const spreadsheetId = sheet.spreadsheetId;

  // Prepare data
  const values = [
    ['Date', 'Pair', 'Bot', 'Type', 'Entry', 'TP1', 'SL', 'Status', 'Structure'],
    ...signals.map((s) => [
      new Date(s.created_at).toLocaleString(),
      s.pair,
      s.ai_bot,
      s.stop_loss < s.entry ? 'BUY' : 'SELL',
      s.entry.toString(),
      s.tp1.toString(),
      s.stop_loss.toString(),
      s.status,
      s.market_structure || 'N/A',
    ]),
  ];

  // Update data
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:I${values.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    }
  );

  if (!updateRes.ok) throw new Error('Failed to update spreadsheet data.');
  
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
};

export const exportToGoogleDrive = async (signals: Signal[]) => {
  const token = await requireWorkspaceToken();

  const fileMetadata = {
    name: `Cosmic Trading Log - ${new Date().toISOString().split('T')[0]}.csv`,
    mimeType: 'text/csv',
  };

  const csvContent = [
    'Date,Pair,Bot,Type,Entry,TP1,SL,Status,Structure',
    ...signals.map((s) => 
      `${new Date(s.created_at).toLocaleString()},${s.pair},${s.ai_bot},${s.stop_loss < s.entry ? 'BUY' : 'SELL'},${s.entry},${s.tp1},${s.stop_loss},${s.status},${s.market_structure || 'N/A'}`
    ),
  ].join('\n');

  const boundary = 'foo_bar_baz';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(fileMetadata) +
    delimiter +
    'Content-Type: text/csv\r\n\r\n' +
    csvContent +
    closeDelimiter;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) throw new Error('Failed to upload file to Google Drive.');
  const file = await res.json();
  return file.id;
};

export const addSessionToGoogleCalendar = async (sessionName: string, startHourUTC: number, endHourUTC: number) => {
  const token = await requireWorkspaceToken();

  const now = new Date();
  const startTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), startHourUTC, 0, 0));
  
  let endHour = endHourUTC;
  let endDaysToAdd = 0;
  if (endHourUTC <= startHourUTC) {
    endDaysToAdd = 1;
  }
  const endTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + endDaysToAdd, endHour, 0, 0));

  // If start time has already passed today, maybe schedule for tomorrow? Let's just schedule for today's block.
  if (startTime.getTime() < now.getTime() && endTime.getTime() < now.getTime()) {
      startTime.setUTCDate(startTime.getUTCDate() + 1);
      endTime.setUTCDate(endTime.getUTCDate() + 1);
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: `[Trading Session] ${sessionName}`,
      description: `Scheduled ${sessionName} trading session block.`,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
    }),
  });

  if (!res.ok) {
     const error = await res.json();
     throw new Error(`Failed to create calendar event: ${error.error?.message || 'Unknown error'}`);
  }
  const data = await res.json();
  return data.htmlLink;
};

export const addToGoogleCalendar = async (event: EconomicEvent) => {
  const token = await requireWorkspaceToken();
  const startTime = new Date(event.time);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: `[Economic] ${event.title} (${event.currency})`,
      description: `Impact: ${event.impact}\nAI Analysis: ${event.ai_analysis || 'None'}`,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
    }),
  });

  if (!res.ok) {
     const error = await res.json();
     throw new Error(`Failed to create calendar event: ${error.error?.message || 'Unknown error'}`);
  }
  const data = await res.json();
  return data.htmlLink;
};
