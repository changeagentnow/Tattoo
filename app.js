(function () {
  const statusEl = document.getElementById("status");
  const optionsEl = document.getElementById("options");
  const addForm = document.getElementById("add-form");
  const newOptionInput = document.getElementById("new-option");

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = "status" + (type ? " " + type : "");
    statusEl.hidden = !message;
  }

  if (
    !window.SUPABASE_URL ||
    !window.SUPABASE_ANON_KEY ||
    window.SUPABASE_URL.indexOf("YOUR_SUPABASE") === 0
  ) {
    showStatus(
      "Voting isn't connected yet — add your Supabase URL and anon key to config.js.",
      "error"
    );
    return;
  }

  const supabase = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );

  function getVoterId() {
    let id = localStorage.getItem("tattoo_voter_id");
    if (!id) {
      id =
        (window.crypto && crypto.randomUUID
          ? crypto.randomUUID()
          : "voter-" + Date.now() + "-" + Math.random().toString(16).slice(2));
      localStorage.setItem("tattoo_voter_id", id);
    }
    return id;
  }

  const voterId = getVoterId();
  let myVoteOptionId = null;

  async function loadMyVote() {
    const { data, error } = await supabase
      .from("votes")
      .select("option_id")
      .eq("voter_id", voterId)
      .maybeSingle();
    if (!error && data) {
      myVoteOptionId = data.option_id;
    }
  }

  async function loadOptions() {
    const { data, error } = await supabase
      .from("option_vote_counts")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      showStatus("Couldn't load options: " + error.message, "error");
      return;
    }
    render(data || []);
  }

  function render(options) {
    optionsEl.innerHTML = "";

    if (!options.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "No options yet — be the first to add one below.";
      optionsEl.appendChild(li);
      return;
    }

    options.forEach((opt) => {
      const li = document.createElement("li");
      li.className = "option" + (opt.id === myVoteOptionId ? " mine" : "");

      const text = document.createElement("div");
      text.className = "option-text";
      text.textContent = opt.text;

      const meta = document.createElement("div");
      meta.className = "option-meta";

      const count = document.createElement("span");
      count.className = "vote-count";
      count.textContent =
        opt.vote_count + (opt.vote_count === 1 ? " vote" : " votes");

      const btn = document.createElement("button");
      btn.className = "vote-btn" + (opt.id === myVoteOptionId ? " voted" : "");
      btn.textContent = opt.id === myVoteOptionId ? "Voted" : "Vote";
      btn.disabled = opt.id === myVoteOptionId;
      btn.addEventListener("click", () => castVote(opt.id));

      meta.appendChild(count);
      meta.appendChild(btn);
      li.appendChild(text);
      li.appendChild(meta);
      optionsEl.appendChild(li);
    });
  }

  async function castVote(optionId) {
    showStatus("", null);
    const { error } = await supabase
      .from("votes")
      .upsert(
        { voter_id: voterId, option_id: optionId },
        { onConflict: "voter_id" }
      );

    if (error) {
      showStatus("Couldn't record your vote: " + error.message, "error");
      return;
    }
    myVoteOptionId = optionId;
    loadOptions();
  }

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = newOptionInput.value.trim();
    if (!text) return;

    const submitBtn = addForm.querySelector("button");
    submitBtn.disabled = true;

    const { error } = await supabase.from("options").insert({ text });

    submitBtn.disabled = false;

    if (error) {
      showStatus("Couldn't add that option: " + error.message, "error");
      return;
    }

    newOptionInput.value = "";
    showStatus("Added! Scroll up to vote for it.", "info");
    loadOptions();
  });

  supabase
    .channel("public:tattoo-voting")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "votes" },
      loadOptions
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "options" },
      loadOptions
    )
    .subscribe();

  (async function init() {
    await loadMyVote();
    await loadOptions();
  })();
})();
