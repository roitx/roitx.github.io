<script>
async function addEvent() {
  const date = document.getElementById("eventDate").value;
  const name = document.getElementById("eventName").value;
  const msg = document.getElementById("eventMsg");

  if (!date || !name) {
    msg.textContent = "❌ Please fill all fields.";
    msg.style.color = "red";
    return;
  }

  const { data: user } = await window.supabaseClient.auth.getUser();

  if (!user) {
    msg.textContent = "❌ Please login first.";
    msg.style.color = "red";
    return;
  }

  const { error } = await window.supabaseClient
    .from("calendar_events")
    .insert([
      {
        user_id: user.user.id,
        event_date: date,
        event_name: name
      }
    ]);

  if (error) {
    msg.textContent = "❌ Error: " + error.message;
    msg.style.color = "red";
  } else {
    msg.textContent = "✅ Event added successfully!";
    msg.style.color = "green";
    document.getElementById("eventDate").value = "";
    document.getElementById("eventName").value = "";
  }
}
</script>