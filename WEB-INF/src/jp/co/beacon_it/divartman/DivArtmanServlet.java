package jp.co.beacon_it.divartman;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.Map;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class DivArtmanServlet extends HttpServlet {

	private static final long serialVersionUID = 1L;

	private ArtmanAccessor accessor = null;

	public void init() {
		String host = getInitParameter("host");
		String userName = getInitParameter("userName");
		String password = getInitParameter("password");
		String account = getInitParameter("account");
		accessor = new ArtmanAccessor(host, userName, password, account);
		System.out.println("# DivArtmanServlet#init");
	}

	public void doPost(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		request.setCharacterEncoding("UTF-8");
		response.setContentType("application/json; charset=UTF-8");
		PrintWriter out = response.getWriter();

		/*
		 * 
		 */
		Map<String, String[]> in = request.getParameterMap();
		for (String key : in.keySet()) {
			String[] strs = in.get(key);
			for (String str : strs) {
				System.out.println(key + " : " + str);
			}
		}
		System.out.println("# " + (request.getSession()).getId());
		/*
		 * 
		 */

		String query = request.getParameter("query");
		query = query.replaceAll("\n", " ").replaceAll(" +", " ");
		String quantity = request.getParameter("quantity");
		String[] columnIds = request.getParameterValues("columnIds");
		String page = request.getParameter("page");
		String sortColumn = request.getParameter("sortColumn");
		String ascDescFlg = request.getParameter("ascDescFlg");
		if (page == null) {
			// first (Gadgets API's request)
			out.println(accessor.getResult(query, Integer.parseInt(quantity)));
		} else {
			out.println(accessor.getResult(query, Integer.parseInt(quantity),
					columnIds, Integer.parseInt(page), sortColumn, ascDescFlg));
		}

	}

}
