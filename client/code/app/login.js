// in client/code/app/login.js

// focus on login/email text box when loaded
$('#login-email').focus();

// submit handler for login.click
$('#login-submit').click(function (e) {
	$('.alert').remove();
    e.preventDefault();
	var email = $('#login-email').val()
	  , password = $('#login-pass').val();

  if(false === validateEmail(email)) {
  	showError("Email address is not valid");
  } else if(false === validatePassword(password)) {
  	showError("Password must be at least 6 characters");
  } else {
    ss.rpc('auth.login', email, password, function(success, err) {
      console.log(err);
      if (success) {
      	window.location = '/';
      } else {
      	showError(err);
      }
    }); 
  } 
});

// submit handler for register.click
$('#register-submit').click(function (e) {
  $('.alert').remove();
  e.preventDefault();
  var email = $('#reg-email').val()
    , pass1 = $('#reg-pass1').val()
    , pass2 = $('#reg-pass2').val();

  if(false === validateEmail(email)) {
  	showError("Email address is not valid");
  } else if (false === validatePassword(pass1)) {
  	showError("Password must be at least 6 characters");
  } else if (false === pass1 === pass2) {
  	showError("Passwords do not match");
  } else {
  	ss.rpc('auth.register', email, pass1, pass2, function(success, err) {
      if (success) {
      	window.location = '/';
      } else {
      	showError(err);
      }
  	});
  }
});

// when user tabs between login/register, set focus on textbox
$("a[data-toggle='tab']").on('shown', function (e) {
  switch($(e.target).attr('href')) {
  	case "#registerTab":
  	  $("#reg-email").focus();
  	  break;
  	case "#loginTab":
  	  $("#login-email").focus();
  	  break;
  }
});

// show an error
function showError(text) {
	var html = ss.tmpl['login-error'].render({message:text});
  $('#myTabContent').slideDown(1000).before(html);
}

// exported function to validate email address
function validateEmail(text) {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(text);
};

// exported function to validate password
function validatePassword (text) {
  return text.length >= 6;
};
