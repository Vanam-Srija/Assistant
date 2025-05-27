sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/Text",
    "sap/m/MessageToast"
  ], function (Controller, Text, MessageToast) {
    "use strict";
  
    return Controller.extend("sap.assistant.assistant.controller.Main", {
      onInit: function () {
        const oMessageModel = new sap.ui.model.json.JSONModel({ messages: [] });
        this.getView().setModel(oMessageModel, "chat");
      },
      
      onToggleChatbot: function () {
        const oView = this.getView();
        const oPanel = oView.byId("chatbotPanel");
        const oButton = oView.byId("openChatbotBtn");
      
        const bVisible = oPanel.getVisible();
        oPanel.setVisible(!bVisible);
      
        oButton.setVisible(bVisible);
      
        if (!bVisible) {
          setTimeout(() => {
            const oInput = oView.byId("chatInput");
            if (oInput) {
              oInput.focus();
            }
          }, 300);
        }
      },
  
      onSend: async function () {
        console.log("MainController: onSend triggered");
      
        const oInput = this.byId("chatInput");
        const question = oInput.getValue().trim();
      
        if (!question) {
          MessageToast.show("Please enter a question.");
          return;
        }
      
        this._addMessage("user", question);
      
        oInput.setValue("");
      
        const sServiceBaseUrl = "/odata/v4/salesorder";
      
        const fetchCsrfToken = async () => {
          const response = await fetch(sServiceBaseUrl, {
            method: "GET",
            headers: {
              "X-CSRF-Token": "Fetch"
            },
            credentials: "include"
          });
      
          if (!response.ok) {
            throw new Error("Failed to fetch CSRF token");
          }
      
          return response.headers.get("X-CSRF-Token");
        };
      
        const callAction = async (actionName, csrfToken) => {
          const res = await fetch(`${sServiceBaseUrl}/${actionName}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrfToken
            },
            body: JSON.stringify({ input: question }),
            credentials: "include"
          });
      
          if (!res.ok) throw new Error(`${actionName} failed`);
          return await res.json();
        };
      
        const formatResponse = (result) => {
          console.log("formatResponse input:", result);
      
          if (!result || !Array.isArray(result.value) || result.value.length === 0) {
            console.warn("formatResponse: Empty or invalid result.value");
            return null;
          }
      
          const val = result.value[0];
      
          if (val.hasOwnProperty('success') && val.success === false) {
            console.warn("formatResponse: success is false, returning null to fallback");
            return null;
          }
      
          if (val.hasOwnProperty('success') && val.success === true) {
            if (val.topCustomers) {
              return val.topCustomers.map(tc =>
                `${tc.customer} - Orders: ${tc.orderCount}, Total: $${tc.totalNetValue}`
              ).join("\n");
            }
      
            if (val.repeatCustomers) {
              return val.repeatCustomers.map(rc =>
                `${rc.customer} - Orders: ${rc.orderCount}`
              ).join("\n");
            }
      
            if (val.latestOrders) {
              const ordersText = val.latestOrders.map(order =>
                `Sales Order ID: ${order.SalesOrderID}\nCreated At: ${order.CreatedAt}`
              ).join("\n\n-------------------------\n\n");
      
              return `${val.message}\n\n${ordersText}`;
            }
      
            if (val.orders) {
              const ordersText = val.orders.map(order =>
                `Sales Order ID: ${order.SalesOrderID}\nCreated At: ${order.CreatedAt}`
              ).join("\n\n-------------------------\n\n");
      
              return `${val.message}\n\n${ordersText}`;
            }
      
            return val.message || "No message available";
          }
      
          if (val.results && Array.isArray(val.results) && val.results.length > 0) {
            return val.results.map(order =>
              Object.entries(order).map(([k, v]) => `${k}: ${v}`).join("\n")
            ).join("\n\n-------------------------\n\n");
          }
      
          if (typeof val === "string") {
            return val;
          }
      
          if (Array.isArray(result.value) && "reply" in result.value[0]) {
            return result.value.map(r => r.reply).join("\n\n-------------------------\n\n");
          }
      
          console.warn("formatResponse: no recognizable data format");
          return null;
        };
      
        try {
          const csrfToken = await fetchCsrfToken();
      
          let result = await callAction("askBot", csrfToken);
          console.log("askBot response:", result);
      
          let formatted = formatResponse(result);
      
          if (!formatted) {
            console.log("askBot response invalid, trying chatbot fallback");
            result = await callAction("chatbot", csrfToken);
            console.log("chatbot response:", result);
            formatted = formatResponse(result);
          }
      
          this._addMessage("bot", formatted || "No results found.");
      
          this.scrollToBottom();
      
        } catch (err) {
          console.error("Exception in onSend:", err);
          this._addMessage("bot", "Unexpected error occurred: " + err.message);
          this.scrollToBottom();
        }
      }
      ,
  
      onKeyUp: function (oEvent) {
        if (oEvent.getParameter("liveValue") && oEvent.getSource().getValue().trim() !== "") {
          if (oEvent.getSource().getValue().includes("\n")) {
            this.onSend();
          }
        }
      },
  
      scrollToBottom: function () {
        setTimeout(() => {
          const oScroll = this.byId("chatScroll");
          const domRef = oScroll && oScroll.getDomRef();
          if (domRef) {
            oScroll.scrollTo(0, domRef.scrollHeight, 300);
          }
        }, 100);
      },
  
      _addMessage: function (role, text) {
        const oMessageModel = this.getView().getModel("chat");
        const aMessages = oMessageModel.getProperty("/messages") || [];
  
        aMessages.push({ role, text });
        oMessageModel.setProperty("/messages", aMessages);
      }
  
    });
  });
  