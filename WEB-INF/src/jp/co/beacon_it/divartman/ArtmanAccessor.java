package jp.co.beacon_it.divartman;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.json.JSONObject;

import asjava.uniclientlibs.UniDynArray;
import asjava.uniclientlibs.UniString;
import asjava.uniobjects.UniCommand;
import asjava.uniobjects.UniCommandException;
import asjava.uniobjects.UniFile;
import asjava.uniobjects.UniFileException;
import asjava.uniobjects.UniJava;
import asjava.uniobjects.UniNLSException;
import asjava.uniobjects.UniSelectList;
import asjava.uniobjects.UniSelectListException;
import asjava.uniobjects.UniSession;
import asjava.uniobjects.UniSessionException;

public class ArtmanAccessor {

	private final int LIST_NO = 0;
	private final byte VALUE_MARK = -3;
	private final byte COMMA = 44;
	private final int NAME_FIELD = 4;
	private final int QUANTITY_DEFAULT = 10;

	private UniSession uniSession = null;
	private String host;
	private String userName;
	private String password;
	private String account;

	public ArtmanAccessor(String host, String userName, String password, String account) {
		this.host = host;
		this.userName = userName;
		this.password = password;
		this.account = account;
	}

	public String getResult(String query, int quantity) {
		JSONObject result = new JSONObject();
		try {
			setUniSession();
			String tableName = getTableName(query);

			/*
			 * get columnIds
			 */

			StringBuilder cmd = new StringBuilder("SELECT DICT ");
			cmd.append(tableName);
			cmd.append(" BY LOC");
			// SELECT DICT ${tableName} BY LOC
			executeCommand(cmd.toString());

			List<String> columnIds = getIds(1, -1);
			List<UniString> columnDatas = getRecords("DICT " + tableName, columnIds);

			/*
			 * get columnModel
			 */
			List<Map<String, String>> columnModel = getColumnModel(columnIds, columnDatas);

			/*
			 * get rows
			 */
			int total = executeCommand(query);
			List<String> ids = getIds(1, quantity);
			List<UniString> records = getRecords(tableName, ids);
			List<Map<String, String>> rows = getRows(ids, records, columnIds);

			/*
			 * get options
			 */
			Map<String, Object> options = getOptions(true, tableName, total, quantity, 1);

			result.put("query", query);
			result.put("columnIds", columnIds);
			result.put("columnModel", columnModel);
			result.put("rows", rows);
			result.put("options", options);
		} catch (UniSessionException e) {
			e.printStackTrace();
		} catch (UniNLSException e) {
			e.printStackTrace();
		} catch (UniCommandException e) {
			e.printStackTrace();
		} catch (UniSelectListException e) {
			e.printStackTrace();
		} catch (UniFileException e) {
			e.printStackTrace();
		} finally {
			closeUniSession();
		}
		return result.toString();
	}

	public String getResult(String query, int quantity, String[] columnIds,
			int page, String sortColumn, String ascDescFlg) {
		JSONObject result = new JSONObject();
		try {
			setUniSession();

			int total = executeCommand(query);
			String tableName = getTableName(query);
			/*
			 * get options
			 */
			Map<String, Object> options = getOptions(false, tableName, total, quantity, page);

			/*
			 * get rows
			 */
			StringBuilder cmd = new StringBuilder("SELECT ");
			cmd.append(tableName);
			List<String> ids = getIds(1, -1);
			for (String id : ids) {
				cmd.append(" '");
				cmd.append(id);
				cmd.append("'");
			}
			if (sortColumn != null && ascDescFlg != null) {
				cmd.append(ascDescFlg.equals("DESC") ? " BY.DSND " : " BY ");
				cmd.append(sortColumn);
			}
			// SELECT &{tableName} 'id1' 'id2' 'id3' BY.DSND ${sortColumn}
			executeCommand(cmd.toString());

			String tmp = (String) ((Map<String, Object>) options.get("pager")).get("currentPage");
			int start = (Integer.parseInt(tmp) - 1) * quantity + 1;
			ids = getIds(start, quantity);
			List<UniString> records = getRecords(tableName, ids);
			List<Map<String, String>> rows = getRows(ids, records, Arrays.asList(columnIds));

			result.put("rows", rows);
			result.put("options", options);
		} catch (UniSessionException e) {
			e.printStackTrace();
		} catch (UniNLSException e) {
			e.printStackTrace();
		} catch (UniCommandException e) {
			e.printStackTrace();
		} catch (UniSelectListException e) {
			e.printStackTrace();
		} catch (UniFileException e) {
			e.printStackTrace();
		} finally {
			closeUniSession();
		}
		return result.toString();
	}

	private void setUniSession() throws UniSessionException, UniNLSException {
		UniJava uniJava = new UniJava();
		uniSession = uniJava.openSession();
		uniSession.connect(host, userName, password, account);
		uniSession.nlsMap().setName("NONE");
	}

	private void closeUniSession() {
		if (uniSession != null) {
			try {
				uniSession.disconnect();
			} catch (UniSessionException e) {
				e.printStackTrace();
			}
		}
	}

	private int executeCommand(String cmd) throws UniSessionException, UniCommandException {
		UniCommand uniCommand = uniSession.command(cmd);
		uniCommand.exec();
		return uniCommand.getAtSelected();
	}

	private String getTableName(String query) {
		return query.split(" ")[1];
	}

	private List<String> getIds(int start, int quantity) throws UniSessionException, UniSelectListException {
		List<String> ids = new ArrayList<String>();

		UniSelectList list = uniSession.selectList(LIST_NO);
		UniString id = null;
		for (int i = 0; !list.isLastRecordRead() && i < start; i++) {
			id = list.next();
		}
		if (quantity < 0) {
			while (!list.isLastRecordRead()) {
				ids.add(id.toString());
				id = list.next();
			}
		} else {
			for (int i = 0; !list.isLastRecordRead() && i < quantity; i++) {
				ids.add(id.toString());
				id = list.next();
			}
		}

		return ids;
	}

	private List<UniString> getRecords(String tableName, List<String> ids)
			throws UniSessionException, UniFileException {
		List<UniString> records = new ArrayList<UniString>();
		UniFile table = null;
		try {
			table = uniSession.open(tableName);
			for (String id : ids) {
				records.add(table.read(id));
			}
		} catch (UniFileException e) {
			throw e;
		} finally {
			if (table != null) {
				try {
					table.close();
				} catch (UniFileException e) {
					e.printStackTrace();
				}
			}
		}
		return records;
	}

	private List<Map<String, String>> getColumnModel(List<String> columnIds, List<UniString> columnDatas) {
		List<Map<String, String>> columnModel = new ArrayList<Map<String, String>>();
		for (int i = 0; i < columnIds.size(); i++) {
			Map<String, String> map = new HashMap<String, String>();
			map.put("id", columnIds.get(i));
			byte[] b = columnDatas.get(i).getBytes();
			for (int bi = 0; bi < b.length; bi++) {
				if (b[bi] == VALUE_MARK) {
					b[bi] = COMMA;
				}
			}
			UniDynArray columnData = new UniDynArray(b);
			map.put("title", columnData.extract(NAME_FIELD).toString());
			map.put("width", "100");
			columnModel.add(map);
		}
		return columnModel;
	}

	private List<Map<String, String>> getRows(List<String> ids, List<UniString> records, List<String> columnIds) {
		List<Map<String, String>> rows = new ArrayList<Map<String, String>>();
		for (int i = 0; i < ids.size(); i++) {
			Map<String, String> row = new HashMap<String, String>();
			row.put(columnIds.get(0), ids.get(i));
			byte[] b = records.get(i).getBytes();
			for (int bi = 0; bi < b.length; bi++) {
				if (b[bi] == VALUE_MARK) {
					b[bi] = COMMA;
				}
			}
			UniDynArray record = new UniDynArray(b);
			for (int j = 1; j <= record.dcount(); j++) {
				row.put(columnIds.get(j), record.extract(j).toString());
			}
			rows.add(row);
		}
		return rows;
	}

	private Map<String, Object> getOptions(boolean first, String tableName,
			int total, int quantity, int page) {
		Map<String, Object> options = new HashMap<String, Object>();

		// example
		// 123 records founds, display 1 to 12 | Page : 1 / 11
		// [total] records founds, display [from] to [to] | Page : [currentPage] / [pages]

		quantity = (quantity <= 0 ? QUANTITY_DEFAULT : quantity);

		Map<String, String> pager = new HashMap<String, String>();

		pager.put("total", String.valueOf(total));

		int pages = (total % quantity == 0) ? (total / quantity) : (total / quantity + 1);
		pager.put("pages", String.valueOf(pages));

		int currentPage = page;
		if (currentPage <= 0) {
			currentPage = 1;
		} else if (currentPage > pages) {
			currentPage = pages;
		}
		pager.put("currentPage", String.valueOf(currentPage));

		int from = (currentPage - 1) * quantity + 1;
		pager.put("from", String.valueOf(from));

		int to = (total < quantity * currentPage) ? total : quantity * currentPage;
		pager.put("to", String.valueOf(to));

		options.put("pager", pager);
		if (!first) {
			return options;
		}

		options.put("title", tableName);
		options.put("width", "1000px");

		return options;
	}

}
