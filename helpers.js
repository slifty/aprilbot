
var get_parameter = function(parameters, index) {
    if(parameters.length <= index)
        return ""
    return parameters[index];
}

var combine_parameters = function(parameters, index) {
    return parameters.join(" ");
}
module.exports = {
	"combine_parameters": combine_parameters,
	"get_parameter": get_parameter
}