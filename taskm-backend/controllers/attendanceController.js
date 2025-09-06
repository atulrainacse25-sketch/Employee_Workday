
const AppDataSource = require('../data-source');
const Attendance = require('../entities/Attendance');
const Leave = require('../entities/Leave');
const Holiday = require('../entities/Holiday');

// Attendance records

exports.getAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const attendanceRepo = AppDataSource.getRepository(Attendance);
    const records = await attendanceRepo.find({ where: { userId }, order: { date: 'DESC' } });
    res.json(records);
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// helper to check if a date (YYYY-MM-DD) is a holiday and return the holiday row if so
const isHoliday = async (dateStr) => {
  // use a raw query that compares date-only to avoid time zone mismatches
  const rows = await AppDataSource.query("SELECT id, name FROM holidays WHERE date = $1::date", [dateStr]);
  return rows && rows.length ? rows[0] : null;
};

exports.checkIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const date = new Date().toISOString().split('T')[0];
    const checkIn = new Date().toTimeString().split(' ')[0];

    // Prevent check-in if today is a holiday
    const holiday = await isHoliday(date);
    if (holiday) return res.status(403).json({ message: `Cannot check in on holiday: ${holiday.name}` });

    const attendanceRepo = AppDataSource.getRepository(Attendance);
    let record = await attendanceRepo.findOneBy({ userId, date });
    if (!record) {
      record = attendanceRepo.create({ userId, date, checkIn, status: 'present' });
      await attendanceRepo.save(record);
    } else {
      record.checkIn = checkIn;
      record.status = 'present';
      await attendanceRepo.save(record);
    }
    res.status(201).json(record);
  } catch (err) {
    console.error('Error on check-in:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const date = new Date().toISOString().split('T')[0];
    const checkOut = new Date().toTimeString().split(' ')[0];

    const attendanceRepo = AppDataSource.getRepository(Attendance);
    const record = await attendanceRepo.findOneBy({ userId, date });
    if (!record) return res.status(404).json({ message: 'Attendance record not found' });

    // If it's a holiday but a record already exists (e.g., created earlier), allow checkout to correct/complete the record
    const holiday = await isHoliday(date);
    if (holiday) {
      console.log(`Holiday ${holiday.name} today but attendance record exists — allowing checkout for record id ${record.id}`);
      // proceed to set checkout
    }

    record.checkOut = checkOut;
    await attendanceRepo.save(record);
    res.status(201).json(record);
  } catch (err) {
    console.error('Error on check-out:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.break = async (req, res) => {
  try {
    const userId = req.user.id;
    const date = new Date().toISOString().split('T')[0];
    const { type } = req.body; // 'start' or 'end'
    const time = new Date().toTimeString().split(' ')[0];

    const attendanceRepo = AppDataSource.getRepository(Attendance);
    const record = await attendanceRepo.findOneBy({ userId, date });
    if (!record) return res.status(404).json({ message: 'Attendance record not found' });

    const holiday = await isHoliday(date);
    // Prevent starting break on a holiday, but allow ending a break if a record exists
    if (holiday && type === 'start') {
      return res.status(403).json({ message: `Cannot start break on holiday: ${holiday.name}` });
    }

    if (type === 'start') {
      record.breakStart = time;
    } else if (type === 'end') {
      record.breakEnd = time;
    } else {
      return res.status(400).json({ message: 'Invalid break type' });
    }

    await attendanceRepo.save(record);
    res.status(201).json(record);
  } catch (err) {
    console.error('Error setting break:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getLeaves = async (req, res) => {
  try {
    const userId = req.user.id;
    const leaveRepo = AppDataSource.getRepository(Leave);
    const leaves = await leaveRepo.find({ where: { userId }, order: { appliedAt: 'DESC' } });
    const formatted = leaves.map(l => ({
      id: l.id,
      startDate: l.startDate instanceof Date ? l.startDate.toISOString().split('T')[0] : l.startDate,
      endDate: l.endDate instanceof Date ? l.endDate.toISOString().split('T')[0] : l.endDate,
      reason: l.reason,
      type: l.type,
      status: l.status,
      appliedAt: l.appliedAt instanceof Date ? l.appliedAt.toISOString() : l.appliedAt,
      hoursPerDay: l.hoursPerDay || null,
      workLocation: l.workLocation || null,
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching leaves:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllLeaves = async (req, res) => {
  try {
    const leaveRepo = AppDataSource.getRepository(Leave);
    const leaves = await leaveRepo.find({ order: { appliedAt: 'DESC' } });
    const formatted = leaves.map(l => ({
      id: l.id,
      userId: l.userId,
      startDate: l.startDate instanceof Date ? l.startDate.toISOString().split('T')[0] : l.startDate,
      endDate: l.endDate instanceof Date ? l.endDate.toISOString().split('T')[0] : l.endDate,
      reason: l.reason,
      type: l.type,
      status: l.status,
      appliedAt: l.appliedAt instanceof Date ? l.appliedAt.toISOString() : l.appliedAt,
      hoursPerDay: l.hoursPerDay || null,
      workLocation: l.workLocation || null,
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching all leaves:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body; // approved/rejected
    const leaveRepo = AppDataSource.getRepository(Leave);
    const rec = await leaveRepo.findOneBy({ id });
    if (!rec) return res.status(404).json({ message: 'Leave request not found' });
    rec.status = status;
    await leaveRepo.save(rec);
    // create notification for user
    try {
      const Notification = require('../entities/Notification');
      const notifRepo = AppDataSource.getRepository(Notification);
      const msg = `Your leave request (${rec.startDate} → ${rec.endDate}) has been ${status}.`;
      const note = notifRepo.create({ userId: rec.userId, message: msg, data: JSON.stringify({ type: 'leave', id: rec.id }), read: false });
      await notifRepo.save(note);
    } catch (nerr) {
      console.warn('Failed to create notification for leave:', nerr.message || nerr);
    }

    res.json({ id: rec.id, status: rec.status });
  } catch (err) {
    console.error('Error updating leave status:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createLeave = async (req, res) => {
  try {
    const userId = req.user.id;
    const leaveRepo = AppDataSource.getRepository(Leave);
    const leaveData = req.body;
    const newLeave = leaveRepo.create({ userId, ...leaveData, status: 'pending' });
    await leaveRepo.save(newLeave);
    const out = {
      id: newLeave.id,
      startDate: newLeave.startDate instanceof Date ? newLeave.startDate.toISOString().split('T')[0] : newLeave.startDate,
      endDate: newLeave.endDate instanceof Date ? newLeave.endDate.toISOString().split('T')[0] : newLeave.endDate,
      reason: newLeave.reason,
      type: newLeave.type,
      status: newLeave.status,
      appliedAt: newLeave.appliedAt instanceof Date ? newLeave.appliedAt.toISOString() : newLeave.appliedAt,
      hoursPerDay: newLeave.hoursPerDay || null,
      workLocation: newLeave.workLocation || null,
    };
    res.status(201).json(out);
  } catch (err) {
    console.error('Error creating leave:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getHolidays = async (req, res) => {
  try {
    const holidayRepo = AppDataSource.getRepository(Holiday);
    let holidays = await holidayRepo.find({ order: { date: 'ASC' } });

    // If no holidays exist, seed a minimal set for this year so the calendar shows them
    if (!holidays || holidays.length === 0) {
      const year = new Date().getFullYear();
      const defaults = [
        { date: `${year}-01-26`, name: 'Republic Day', type: 'national' },
        { date: `${year}-08-15`, name: 'Independence Day', type: 'national' },
        { date: `${year}-10-02`, name: 'Gandhi Jayanti', type: 'national' },
        { date: `${year}-12-25`, name: 'Christmas', type: 'national' },
      ];
      try {
        for (const h of defaults) {
          const exists = await holidayRepo.findOneBy({ date: h.date });
          if (!exists) {
            const rec = holidayRepo.create(h);
            await holidayRepo.save(rec);
          }
        }
      } catch (e) {
        console.warn('Failed to seed default holidays:', e && e.message ? e.message : e);
      }
      holidays = await holidayRepo.find({ order: { date: 'ASC' } });
    }

    // format date to YYYY-MM-DD string to avoid timezone issues
    const formatted = holidays.map(h => ({ id: h.id, date: h.date instanceof Date ? h.date.toISOString().split('T')[0] : h.date, name: h.name, type: h.type }));
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching holidays:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createHoliday = async (req, res) => {
  try {
    const { date, name, type } = req.body;
    if (!date || !name) return res.status(400).json({ message: 'date and name required' });
    const holidayRepo = AppDataSource.getRepository(Holiday);
    const existing = await holidayRepo.findOneBy({ date });
    if (existing) return res.status(409).json({ message: 'Holiday already exists for this date' });
    const rec = holidayRepo.create({ date, name, type: type || 'company' });
    await holidayRepo.save(rec);
    res.status(201).json(rec);
  } catch (err) {
    console.error('Error creating holiday:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
