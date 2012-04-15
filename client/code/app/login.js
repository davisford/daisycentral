
$('#login-submit').click(function (e) {
	$('.alert').remove();
    e.preventDefault();
	var email = $('#login').val();
	var password1 = $('#password').val();
	var password2 = $('#password2').val();

  if(false === exports.validateEmail(email)) {
  	showError("Email address is not valid");
  } else if(false === exports.validatePassword(password1) || 
  	        false === exports.validatePassword(password2)) {
  	showError("Password must be at least 8 characters with 1 Uppercase, 1 lowercase, and 1 special character");
  } else if(password1 !== password2) {
  	showError("Passwords do not match");
  } else {
    ss.rpc('auth.login', email, password1, rememberme, function(success) {
      if (success) {
      	alert('success');
      } else {
      	alert('login failed');
      }
    });
  }
});

function showError(text) {
  $('#myTabContent').slideDown(1000).before("<div class='alert alert-error'><a class='close' data-dismiss='alert'>&times;</a><p>"+text+"</p></div>");
}

exports.validateEmail = function (text) {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(text);
}

exports.validatePassword = function (text) {
  var re = /(?=^.{8,}$)((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;
  return re.text(text);
}
