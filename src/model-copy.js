// Plain-language copy for the "How the model works" view. It states the model's
// formulas in prose and symbols, with no worked numbers, so the reference holds
// for any plan.
//
// Sections follow the order the model computes them; the view numbers them
// along that route.

function para(text) {
  return { type: "p", text: text };
}

function formula(text) {
  return { type: "formula", text: text };
}

function universeSection() {
  return {
    id: "universe",
    title: "One universe, sized from the vote goal",
    blocks: [
      para(
        "You type the vote goal in. That number is the universe, the pool the field works. The " +
          "calculator does not size it for you."
      ),
      formula("universe = vote goal"),
      para(
        "Everyone starts uncontacted, becomes a holdout once you have talked to them, and lands " +
          "in confirmed when they signal they will vote with you. Nobody leaves the universe " +
          "until they confirm. Volunteers and the candidate knock the same pool."
      ),
    ],
  };
}

function capsSection() {
  return {
    id: "caps",
    title: "What gets knocked each day",
    blocks: [
      para(
        "Weekly hours convert to doors at the knock rate: the volunteers for the hours each " +
          "gives, the candidate for their own."
      ),
      formula(
        "volunteer doors/day = volunteers × hours per volunteer per week × knock rate ÷ 7\n" +
          "candidate doors/day = candidate hours per week × knock rate ÷ 7"
      ),
    ],
  };
}

function accrualSection() {
  return {
    id: "accrual",
    title: "Contacts and confirmations accrue per door",
    blocks: [
      para(
        "A knock reaches someone at your contact rate, and every reach is a conversation. A " +
          "conversation confirms at your confirmation rate. Holdouts confirm on a later pass, at " +
          "the same rate, so each pass compounds and adds less than the last."
      ),
      formula(
        "conversations = knocks × contact rate\n" +
          "confirmations = conversations × confirmation rate\n" +
          "over k passes: 1 − (1 − contact rate × confirmation rate)^k"
      ),
      para(
        "Each day's capacity goes to uncontacted doors first, and leftover knocks revisit " +
          "holdouts. A knock that reaches no one is a lit drop. Once confirmations cross the " +
          "vote goal, the field stops."
      ),
    ],
  };
}

function turnoverSection() {
  return {
    id: "turnover",
    title: "Volunteers turn over",
    blocks: [
      para(
        "Each day volunteers gain recruits and lose a share of their count, floored at zero. " +
          "Hold both steady and the count settles toward the steady state."
      ),
      formula(
        "volunteers += recruits ÷ 7 − volunteers × attrition ÷ 7\n" +
          "dV/dt = recruits − attrition × V\n" +
          "steady state = recruitment ÷ attrition"
      ),
    ],
  };
}

function paceSection() {
  return {
    id: "pace",
    title: "The vote-goal pace line",
    blocks: [
      para(
        "The pace line runs straight from zero today to the vote goal on election day. Above it, " +
          "the goal crosses early. Below it, late. The timeline draws confirmations against it."
      ),
      formula("pace line = vote goal × elapsed days ÷ total campaign days"),
    ],
  };
}

function verdictSection() {
  return {
    id: "verdict",
    title: "The final verdict",
    blocks: [
      para(
        "One number comes out: the vote-goal projection. It says whether confirmations cross the " +
          "goal, on what day, and by how much they fall short."
      ),
    ],
  };
}

export function explain() {
  return {
    lede:
      "The model's math in plain language, so you can check the plan against how your field " +
      "actually works.",
    sections: [
      universeSection(),
      capsSection(),
      accrualSection(),
      turnoverSection(),
      paceSection(),
      verdictSection(),
    ],
  };
}