var SelectBoxResetter = Class.create();
SelectBoxResetter.prototype = {
	initialize : function() {
		var oldOptions = $$("option.query_name_index");
		for ( var i = 0; oldOptions != null && i < oldOptions.length; i++) {
			oldOptions[i].remove();
		}
		$("query_text").innerHTML = "クエリー表示";
		var queries = gadgets.json.parse(gadgets.util.unescapeString(prefs
				.getString("queries")))["Queries"];
		for ( var i = 0; queries != null && i < queries.length; i++) {
			var option = new Element("option", {
				class : "query_name_index",
				value : i
			});
			option
					.appendChild(document
							.createTextNode(queries[i]["QueryName"]));
			$("select_box").appendChild(option);
		}
	}
};

var QueriesManager = Class.create();
QueriesManager.prototype = {
	initialize : function() {
		this.queries = gadgets.json.parse(gadgets.util.unescapeString(prefs
				.getString("queries")))["Queries"];
		if (this.queries == null) {
			this.queries = new Array();
		}
	},
	add : function(newQueryName, newQuery) {
		this.queries.push( {
			QueryName : newQueryName,
			Query : newQuery
		});

	},
	remove : function(index) {
		this.queries.splice(index, 1);
	},
	save : function() {
		prefs.set("queries", gadgets.json.stringify( {
			"Queries" : this.queries
		}));
	}
};

var ModalManager = Class.create();
ModalManager.prototype = {
	initialize : function() {
		var div = new Element("div");
		var div1 = new Element("div");
		var div2 = new Element("div");
		var div3 = new Element("div", {
			id : "query_table"
		});
		var div4 = new Element("div");
		var input = new Element("input", {
			id : "new_query_name",
			type : "text"
		});
		var textArea = new Element("textarea", {
			id : "new_query"
		});
		var text1 = document.createTextNode("名前：");
		var text2 = document.createTextNode("クエリー：");
		var button1 = new Element("button", {
			id : "add"
		});
		button1.appendChild(document.createTextNode("追加"));
		var button2 = new Element("button", {
			id : "save"
		});
		button2.appendChild(document.createTextNode("保存"));
		var button3 = new Element("button", {
			id : "cancel"
		});
		button3.appendChild(document.createTextNode("キャンセル"));
		div.appendChild(div1);
		div.appendChild(div2);
		div.appendChild(div3);
		div.appendChild(div4);
		div1.appendChild(text1);
		div1.appendChild(input);
		div2.appendChild(text2);
		div2.appendChild(textArea);
		div2.appendChild(button1);
		div4.appendChild(button2);
		div4.appendChild(button3);
		this.queryManageModal = new Control.Modal("", {
			className : "query_manage_modal",
			overlayOpacity : 0.7,
			fade : false
		});
		this.queryManageModal.container.update(div);
		this.queriesManager = null;
	},
	open : function() {
		this.queryManageModal.open();
		this.queriesManager = new QueriesManager();
		this.queryTable = new QueryTable(this.queriesManager);
		this.queryTable.rerender();
	},
	add : function(newQueryName, newQuery) {
		this.queriesManager.add(newQueryName, newQuery);
		this.queryTable.rerender();
	},
	save : function() {
		this.queriesManager.save();
	},
	remove : function(index) {
		this.queriesManager.remove(index);
		this.queryTable.rerender();
	},
	cancel : function() {
		this.queryManageModal.close();
	}
};

var QueryTable = Class.create();
QueryTable.prototype = {
	initialize : function(queriesManager) {
		this.queriesManager = queriesManager;
		this.options = {
			title : "クエリ一覧",
			afterRender : function() {
				var icons = $$("img.trash");
				for ( var i = 0; i < icons.length; i++) {
					var icon = icons[i];
					icon.observe("click", function() {
						var index = this.getAttribute("value");
						modalManager.remove(index);
					});
				}
			}
		};
		this.columnModel = [ {
			id : "icon",
			title : "",
			width : 50,
			sortable : false,
			editable : false
		}, {
			id : "name",
			title : "名前",
			width : 100,
			sortable : false
		}, {
			id : "query",
			title : "クエリー",
			width : 200,
			sortable : false
		} ];

	},
	rerender : function() {
		$("query_table").update("");
		var queries = this.queriesManager.queries;

		if (queries != null) {
			var rows = new Array();
			for ( var i = 0; queries != null && i < queries.length; i++) {
				rows.push( {
					icon : "<img src=\"" + baseURL
							+ "/imgs/trash.gif\" class=\"trash\" value=\"" + i
							+ "\">",
					name : queries[i]["QueryName"],
					query : queries[i]["Query"]
				});
			}

			this.queryTable = new MY.TableGrid( {
				options : this.options,
				columnModel : this.columnModel,
				rows : rows
			});
			this.queryTable.show("query_table");

		}
	}
};

function init() {
	new SelectBoxResetter();

	Event.observe("select_box", "change", function() {
		var queries = gadgets.json.parse(gadgets.util.unescapeString(prefs
				.getString("queries")))["Queries"];
		var index = $F("select_box");
		$("query_text").innerHTML = (index < 0 ? "クエリー表示"
				: queries[index]["Query"].replace(/\n/g, "<br>").replace(/ /g,"&nbsp;"));
	});
	Event.observe("execute", "click", function() {
		var queries = gadgets.json.parse(gadgets.util
				.unescapeString(prefs.getString("queries")))["Queries"];
		var index = $F("select_box");
		if (index < 0) {
			return;
		}
		var url = gadgets.util.unescapeString(prefs.getString("url"));
		var quantity = gadgets.util.unescapeString(prefs.getString("quantity"));
		if (isNaN(quantity) == true || quantity.length == 0) {
			alert("「表示件数」は半角数字で入力して下さい。\n10件で表示します。");
			quantity = 10;
		}

		var params = {
			METHOD : "POST",
			POST_DATA : "query=" + queries[index]["Query"]+ "&quantity=" + quantity
		};
		gadgets.io.makeRequest(url, function(response) {
			var tmp = gadgets.json.parse(response.text);
			var tableModel = {
					url : url,
					options : tmp["options"],
					columnModel : tmp["columnModel"],
					rows : tmp["rows"]
			};
			var resultTable = new MY.TableGrid(tableModel);
			resultTable.request["query"] = tmp["query"];
			resultTable.request["quantity"] = quantity;
			resultTable.request["columnIds"] = tmp["columnIds"];
			resultTable.show("result_table");
		}, params);
	});
	Event.observe("query_manage", "click", function() {
		modalManager.open();
	});
	Event.observe("add", "click", function() {
		var newQueryName = $F("new_query_name");
		var newQuery = $F("new_query");
		if (newQueryName.length > 0 && newQuery.length > 0) {
			modalManager.add(newQueryName, newQuery);
		} else {
			alert("「名前」と「クエリー」は入力必須です。")
		}

	});
	Event.observe("save", "click", function() {
		modalManager.save();
		new SelectBoxResetter();
		alert("保存しました。");
	});
	Event.observe("cancel", "click", function() {
		modalManager.cancel();
	});
}

var prefs = new gadgets.Prefs();
var modalManager = new ModalManager();
gadgets.util.registerOnLoadHandler(init);

console.log("# initialized");
