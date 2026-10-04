function toast(message){
  const node=document.getElementById("toast");
  node.textContent=message;
  node.classList.add("show");
  clearTimeout(window.__accountToast);
  window.__accountToast=setTimeout(()=>node.classList.remove("show"),2200);
}

function showAccountState(){
  const user=window.SupplyHQAPI.user();
  const signedOut=document.getElementById("signedOut");
  const signedIn=document.getElementById("signedIn");
  if(user){
    signedOut.hidden=true;
    signedIn.hidden=false;
    document.getElementById("accountEmail").textContent=user.email;
    document.getElementById("accountRole").textContent=user.role;
    document.getElementById("accountState").textContent=user.status || "Active";
  }else{
    signedOut.hidden=false;
    signedIn.hidden=true;
  }
}

async function checkApi(){
  const node=document.getElementById("apiStatus");
  try{
    const health=await window.SupplyHQAPI.health();
    node.textContent=(health && health.status==="online" ? "API online" : "API reachable")+" • "+window.SupplyHQAPI.API_URL;
    node.className="api-status ok";
  }catch(error){
    node.textContent="API not deployed yet • frontend can still run locally";
    node.className="api-status bad";
  }
}

document.querySelectorAll("[data-auth-tab]").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const tab=btn.dataset.authTab;
    document.querySelectorAll("[data-auth-tab]").forEach(b=>b.classList.toggle("active",b===btn));
    document.querySelectorAll(".auth-form").forEach(form=>form.classList.remove("active"));
    document.getElementById(tab+"Form").classList.add("active");
  });
});

document.getElementById("loginForm").addEventListener("submit",async event=>{
  event.preventDefault();
  const form=new FormData(event.currentTarget);
  const remember=Boolean(form.get("remember"));
  const button=event.currentTarget.querySelector("button[type='submit'],button:not([type])");
  button.disabled=true;
  button.textContent="Signing in…";
  try{
    await window.SupplyHQAPI.login({
      email:String(form.get("email")||"").trim(),
      password:String(form.get("password")||"")
    },remember);
    toast("Signed in successfully");
    showAccountState();
  }catch(error){
    toast(error.message || "Unable to sign in");
  }finally{
    button.disabled=false;
    button.textContent="Sign in";
  }
});

document.getElementById("registerForm").addEventListener("submit",async event=>{
  event.preventDefault();
  const form=new FormData(event.currentTarget);
  const remember=Boolean(form.get("remember"));
  const button=event.currentTarget.querySelector("button[type='submit'],button:not([type])");
  button.disabled=true;
  button.textContent="Creating account…";
  try{
    await window.SupplyHQAPI.register({
      email:String(form.get("email")||"").trim(),
      password:String(form.get("password")||""),
      role:String(form.get("role")||"buyer")
    },remember);
    toast("Account created");
    showAccountState();
  }catch(error){
    toast(error.message || "Unable to create account");
  }finally{
    button.disabled=false;
    button.textContent="Create account";
  }
});

document.getElementById("logoutBtn").addEventListener("click",()=>{
  window.SupplyHQAPI.clearSession();
  toast("Signed out");
  showAccountState();
});

showAccountState();
checkApi();