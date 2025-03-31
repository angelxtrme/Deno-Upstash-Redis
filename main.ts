import { serve } from "https://deno.land/std@0.142.0/http/server.ts";
import { Redis } from "https://deno.land/x/upstash_redis@v1.23.0/mod.ts";

serve(async (_req: Request) => {
  if (!_req.url.endsWith("favicon.ico")) {
    const { searchParams, pathname } = new URL(_req.url);
  
		const type = pathname.split('/')[1];
		const field = pathname.split('/')[2];
		const key = (type && field) ? type+':'+field : null;

    const search = searchParams.get('search');
    const last_name = searchParams.get('last_name');
    const first_name = searchParams.get('first_name');
    const employee_id = searchParams.get('employee_id');
    const biometrics_no = searchParams.get('biometrics_no');

		console.log('[Start] '+key);
		console.time('Duration');

    // ! ----------------------------------------------------------------------------------------------------

    const redis = new Redis({
      url: Deno.env.get("UPSTASH_REDIS_REST_URL"),
      token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")
    });

    // ! ----------------------------------------------------------------------------------------------------

		if(!await redis.exists(key)) {
			console.timeEnd('Duration');
			console.log('[End] '+key);

      return new Response(JSON.stringify({
        [key]: null
      }), {
        status: 400
      });
		}

		// ! ----------------------------------------------------------------------------------------------------

		let data = null;

		if(key === 'json:employees') {
			if(search) {
				const regExp = new RegExp(search, 'i');
				const result = await redis.json.get(key);

				data = result.length
					? result.reduce((accumulator, currentEmployee) => {
						const { lastName, firstName, employeeID, biometricsNo } = currentEmployee;

						if(regExp.test(lastName) === true || regExp.test(firstName) === true
							|| biometricsNo === search || employeeID === search) {
							accumulator = [
								...accumulator,
								currentEmployee
							];
						}

						return accumulator;
					}, [])
					: [];
			} else if(last_name) {
				data = await redis.json.get(key, '$.[?(@.lastName == "'+last_name+'")]');
			} else if(first_name) {
				data = await redis.json.get(key, '$.[?(@.firstName == "'+first_name+'")]');
			} else if(employee_id) {
				data = await redis.json.get(key, '$.[?(@.employeeID == "'+employee_id+'")]');
			} else if(biometrics_no) {
				data = await redis.json.get(key, '$.[?(@.biometricsNo == "'+biometrics_no+'")]');
			} else {
				data = await redis.json.get(key);
			}
		} else {
			data = await redis.get(key);
		}

		// ! ----------------------------------------------------------------------------------------------------

		console.timeEnd('Duration');
		console.log('[End] '+key);

    return new Response(JSON.stringify({
      [key]: data
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});