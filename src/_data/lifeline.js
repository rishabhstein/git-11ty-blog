const birthDate = "1991-12-22";
const lifespan = 100;
const weeksInYear = 52;

const today = new Date();
const birth = new Date(birthDate);
const weeksLived = Math.floor((today - birth) / (1000 * 60 * 60 * 24 * 7));

// Define milestones using actual dates
const milestonesRaw = [
  { date: "1991-12-22", label: "I came to this world" },
  { date: "1992-09-01", label: "Started School" },
  { date: "2009-06-15", label: "Graduated High School" },
  { date: "2010-06-15", label: "Started Bachelor of Technology" },
  { date: "2014-06-15", label: "Finished Bachelor degree" },
  { date: "2015-06-15", label: "Started Master in Engineering" },
  { date: "2017-06-15", label: "Graduated Master degree" },
  { date: "2017-08-01", label: "First Job" },
  { date: "2018-11-11", label: "Moved to Poland and started PhD" },
  { date: "2024-11-22", label: "💞 Got Married" },
  { date: "2025-04-01", label: "Submitted PhD thesis" },
  { date: "2025-06-16", label: "Awarded PhD" },
  { date: "2025-08-11", label: "💔 My younger cousin died" },
  { date: "2025-10-07", label: "Started first Postdoc" }
];

// Calculate week numbers
const milestones = milestonesRaw.map(m => ({
  week: Math.floor((new Date(m.date) - birth) / (1000 * 60 * 60 * 24 * 7)) + 1,
  label: m.label,
  date: m.date
}));

module.exports = {
  birthDate,
  lifespan,
  weeksInYear,
  weeksLived,
  milestones
};


