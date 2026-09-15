# Field Plan

A labor and pace calculator for door-knock campaigns: the day-by-day timeline from
today to Election Day as volunteers join and leave, and whether the field confirms
more votes than its goal in time. Not GOTV-specific — GOTV is one phase on the way
there.

## Language

**Vote Goal**:
The confirmed votes the campaign needs to win. It is the calculator's only ask and
the bar the field works toward: the field keeps knocking until confirmations cross
it. The universe is sized from it.
_Avoid_: conversation target, win number

**Voter Universe**:
The set of people the campaign intends to reach, sized from the vote goal. One
pool: volunteers and the candidate both knock it. The universe is the ceiling: of
a given universe the field will likely never reach everyone, and the curves
approach it asymptotically. Going deeper into new segments is a campaign decision
once the model plateaus, out of scope for the model.
_Avoid_: list, target, base, persuasion

**Uncontacted**:
Someone in the universe the campaign has not yet reached: no conversation yet.

**Holdout**:
Someone who has had the conversation but has not confirmed. Repeat passes work
the holdouts as their pool shrinks.

**Repeat Pass**:
Another sweep over the people who have not confirmed. Passes are not scheduled;
they emerge from the daily loop. A full second pass for GOTV is the norm.

**Knock**:
One attempt at a door, whether or not anyone answers.

**Contact**:
A knock that resulted in a conversation with a person.

**Contact Rate**:
The share of knocks that become contacts. One set of field mechanics applies to
every knocker, on a first pass or a revisit.

**Confirmation**:
A contact who gives the strongest available signal they will vote with us.
Confirmations are re-contacted during the GOTV phase to carry them to the polls.

**Confirmation Rate**:
The share of conversations that end in a confirmation. A fresh conversation
confirms on the spot; a holdout confirms when a later pass reaches them, so repeat
passes compound a holdout's chance of confirming.

**Lit Drop**:
A knock that reaches no one. The knocker leaves a walk card, and the door stays
uncontacted or a holdout to be retried on a later pass.

**Volunteers**:
The people knocking the universe, alongside the candidate.
_Avoid_: crew, team

**Candidate**:
A second knocker with their own weekly hours, working the same universe as the
volunteers.

**Recruitment**:
New volunteers joining each week.

**Attrition**:
The share of volunteers lost each week. Losses cancel against recruits, so the
volunteers settle toward a steady state rather than growing without bound.

**Steady State**:
The volunteer count recruitment and attrition settle toward when both hold constant:
recruitment ÷ attrition.

**Knock Rate**:
Doors knocked per hour, the same for every knocker. It converts each knocker's
weekly hours into the doors they can work.

**Vote-Goal Pace Line**:
The straight line from zero today to the vote goal on Election Day. Confirmations
above it cross the goal early; below it, the goal lands late. Conversations can
climb past the line as holdouts are reworked.

**Election Day**:
The first Tuesday after the first Monday in November, unless the campaign sets
another date.
