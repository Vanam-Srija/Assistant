using { GWSAMPLE_BASIC as external } from './external/GWSAMPLE_BASIC';

service salesorder {
  action askBot(input:String) returns array of SalesOrderSet;
  action chatbot(input:String) returns array of SalesOrderSet;
  entity SalesOrderSet as projection on external.SalesOrderSet;
}