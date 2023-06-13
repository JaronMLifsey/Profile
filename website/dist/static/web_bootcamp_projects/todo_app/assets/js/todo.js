// Check Off Specific Todos By Clicking
$("ul").on("click", "li", function(){
  $(this).toggleClass("completed");
});

// Click on X to delete Todo
$("ul").on("click", "span",function(e){
  $(this).parent().slideUp(150, function(){
    $(this).remove();
  });
  e.stopPropagation();
});

// Enter new next creates a new todo
$("input[type=text]").keypress(function(e){
  if (/enter/i.test(e.key)){
    if ($(this).val().length > 0){
      $("ul").append("<li class=\"hidden\">" + $(this).val() + "<span><i class=\"fas fa-trash\"></i></span></li>");
      $("ul li:last-of-type").show('fast');
    }
    $(this).val("");
  }
});

$("h1 i").click(function(){
  $(".input-container").slideToggle(250);
});