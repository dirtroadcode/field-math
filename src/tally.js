// The scrub readout's day sheet as data: one row per knocker plus the campaign
// total, each already carrying the columns the table shows. Pure so the
// breakdown can be tested without a DOM.
import { BAND_VOLUNTEER, BAND_CANDIDATE } from "./timeline-labels.js";

function hours(knocks, knockRate) {
  return knockRate > 0 ? knocks / knockRate : 0;
}

export function tallyRows(day, knockRate) {
  return {
    rows: [
      {
        label: "Volunteer",
        band: BAND_VOLUNTEER,
        conversations: day.cumVolunteerContacts,
        confirmed: day.cumVolunteerConfirmations,
        litDrops: day.cumVolunteerLitDrops,
        hours: hours(day.cumVolunteerKnocks, knockRate),
        volunteers: day.volunteers,
      },
      {
        label: "Candidate",
        band: BAND_CANDIDATE,
        conversations: day.cumCandidateContacts,
        confirmed: day.cumCandidateConfirmations,
        litDrops: day.cumCandidateLitDrops,
        hours: hours(day.cumCandidateKnocks, knockRate),
        volunteers: null,
      },
    ],
    total: {
      label: "Total",
      band: null,
      conversations: day.cumContacts,
      confirmed: day.cumConfirmations,
      litDrops: day.cumLitDrops,
      hours: hours(day.cumKnocks, knockRate),
      volunteers: day.volunteers,
    },
  };
}
