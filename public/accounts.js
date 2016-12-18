// client-side js
// run by the browser each time your view template is loaded

// by default, you've got jQuery,
// add other scripts at the bottom of index.html

$(function() {
  $.get('/accounts', function(accounts) {
    accounts.forEach(function(account) {
      link = 'accounts/' + account._id;
      row = '<tr>' + 
        '<td><a href="' + link + '">' + account.titre + '</a></td>' + 
        '<td>' + account.site + '</td>' + 
        '<td>' + account.mail + '</td>' +
        '<td>' + account.contact + '</td>' +
        '<td>';
      if  (account.screenshot) {
        row += '<img height="50" src="screenshots/' + account.screenshot +'"/>';
      }
      row += '</td>' +
        '</tr>';
      $('table#tabaccounts').append(row);
    });
  });
});
