var QueryManageModal = Class.create();
QueryManageModal.prototype = {
	initialize : function() {
		// prepare variable (use in modal)
		this.queriesClone = new Array();

		// prepare modal
		this.modal = new Control.Modal("", {
			className : "modal",
			overlayOpacity : 0.7,
			fade : false,
			closeOnClick : false
		});
		this.modal.container.update($("modal_root"));
		
		this.controlWindowTag=$$("div.modal")[0];

		// prepare variables (using table)
		this.options = {
				afterRender : setRemoveEvent
		};
		this.columnModel = [ {
			id : "icon",
			title : "",
			width : 30,
			sortable : false
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
	open : function() {
		// initialize variable
		this.queriesClone.clear();
		if (queries != null) {
			this.queriesClone = queries.concat();
		}

		// open modal
		this.modal.open();

		// show table
		this._rerenderTable();
	},
	add : function() {
		var newQueryName = $F("new_query_name");
		var newQuery = $F("new_query");
		if (newQueryName.length == 0 || newQuery.length == 0) {
			alert("「名前」と「クエリー」は入力必須です。");
		} else {
			this.queriesClone.push( {
				QueryName : newQueryName,
				Query : newQuery
			});
			this._rerenderTable();
		}
	},
	save : function() {
		// save UserPref ("queries")
		prefs.set("queries", gadgets.json.stringify( {
			Queries : this.queriesClone
		}));

		// sync "queries" variable
		if (queries != null) {
			queries.clear();
		}
		queries = this.queriesClone.concat();

		// reset select box
		resetSelectBox();

		// close modal
		this.modal.close();
	},
	cancel : function() {
		// close modal
		this.modal.close();
	},
	remove : function(index) {
		this.queriesClone.splice(index, 1);
		this._rerenderTable();
	},
	_rerenderTable : function() {
	
//		$("query_table").update("");
		/*
		 * この処理をするとモーダル内のテーブルではなく、クエリ結果のテーブルに表示される。
		 * (クエリの結果を表示するテーブルはupdate("")しないと上記が発生する。)
		 * ライブラリの振ってくるタグのidが3まで増える。(別件か？)
		 */
		
		var width = this.controlWindowTag.getWidth();
		var height = this.controlWindowTag.getHeight()
				- $("modal_head_div").getHeight()
				- $("modal_bottom_div").getHeight();
		$("query_table").style.width = width;
		$("query_table").style.height = height;

		// create "rows" variable (using table)
		var rows = new Array();
		for ( var i = 0; this.queriesClone != null && i < this.queriesClone.length; i++) {
			var row = {
				icon : "<img class=\"trash\" src=\"" + baseURL
						+ "/imgs/trash.gif\" vlaue=\"" + i + "\">",
				name : gadgets.util.escapeString(this.queriesClone[i]["QueryName"]),
				query : gadgets.util.escapeString(this.queriesClone[i]["Query"])
			};
			rows.push(row);
		}

		queryTable = new MY.TableGrid( {
			options : this.options,
			columnModel : this.columnModel,
			rows : rows
		});
		queryTable.show("query_table");
}
};

var body = document.getElementsByTagName("body")[0];
var prefs = new gadgets.Prefs();
var queries = gadgets.json.parse(gadgets.util.unescapeString(prefs
		.getString("queries")))["Queries"];
var queryManageModal = null;
var resultTable = null;
var queryTable=null;

// use for modal
$("modal_root").style.display = "none";

resize();

resetSelectBox();

var timer = null;
Event.observe(window, "resize", function() {
	resize();
});

$("execute_button").observe("click", function() {
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
		POST_DATA : "query=" + queries[index]["Query"] + "&quantity=" + quantity
	};
	gadgets.io.makeRequest(url, function(response) {
		var tmp = gadgets.json.parse(response.text);
				
		$("result_table").update("");
		resize();
		var tableModel = {
			url : url,
			options : tmp["options"],
			columnModel : tmp["columnModel"],
			rows : tmp["rows"]
		};
		resultTable = new MY.TableGrid(tableModel);
		resultTable.request["query"] = tmp["query"];
		resultTable.request["quantity"] = quantity;
		resultTable.request["columnIds"] = tmp["columnIds"];
		resultTable.show("result_table");
	}, params);
});

$("query_manage_button").observe("click", function() {
	// initialize (first modal open)
	if (queryManageModal == null) {
		// prototytpe.jsに.show()と.hyde()
		$("modal_root").style.display = "block";

		queryManageModal = new QueryManageModal();

		// set events
		$("add_button").observe("click", function() {
			queryManageModal.add();
		});
		$("save_button").observe("click", function() {
			queryManageModal.save();
		});
		$("cancel_button").observe("click", function() {
			queryManageModal.cancel();
		});
	}

	queryManageModal.open();
});

function resize() {
	/*
	 * クエリ結果を表示するテーブル部分のdisplayを"none"->"block"にすると
	 * widthとheight、モーダルのサイズの変更が適用される。
	 */
	$("result_table").style.display = "none";
	var width = body.getWidth();
	var height = body.getHeight() - $("head_div").getHeight();
	var height=document.documentElement.clientHeight - $("head_div").getHeight();
	$("result_table").style.width = width;
	$("result_table").style.height = height;
	$("result_table").style.display = "block";
	/*
	 * ???
	 * none -> block
	 */
	
	if (queryManageModal != null) {
//		$("control_window_2").style.left = Math
//				.floor((window.innerWidth - window.innerWidth * 0.8) * 0.5);
//		$("control_window_2").style.top = Math
//				.floor((window.innerHeight - window.innerHeight * 0.8) * 0.5);
		$("query_table").style.width=queryManageModal.modal.container.getWidth();
//		$("query_table").style.width = $("control_window_2").getWidth();
		$("query_table").style.height = queryManageModal.modal.container.getHeight()
				- $("modal_head_div").getHeight()
					- $("modal_bottom_div").getHeight();
//		$("query_table").style.height = $("control_window_2").getHeight()
//				- $("modal_head_div").getHeight()
//				- $("modal_bottom_div").getHeight();
	}
}

function resetSelectBox() {
	// clear old "<option>"
	var oldOptions = $$("option.query_name_index");
	for ( var i = 0; oldOptions != null && i < oldOptions.length; i++) {
		oldOptions[i].remove();
	}

	// create new "<option>"
	for ( var i = 0; queries != null && i < queries.length; i++) {
		var option = new Element("option", {
			"class" : "query_name_index",
			value : i
		});
		option.appendChild(document.createTextNode(gadgets.util
				.escapeString(queries[i]["QueryName"])));
		$("select_box").appendChild(option);
	}
}

/*
 * ここに書きたくない。
 * https://gist.github.com/m24ishizuka/b73b28b3ad0910007eb8
 */
function setRemoveEvent() {
	var icons = $$("img.trash");
	for ( var i = 0; icons != null && i < icons.length; i++) {
		var icon = icons[i];
		icon.observe("click", function() {
			var index = this.getAttribute("value");
			queryManageModal.remove(index);
		});
	}
}
