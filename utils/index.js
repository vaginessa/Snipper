/**
 * Created by abhishek on 29/07/17.
 */
'use strict';
 
module.exports = {
    now () {
        let dateString = "";
        let newDate = new Date();

        dateString += (newDate.getMonth() + 1) + "-";
        dateString += newDate.getDate() + "-";
        dateString += newDate.getFullYear();
        
        return dateString;
    },
    
}