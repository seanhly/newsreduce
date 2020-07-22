select id, url
from (
    select
        ResourceURL.id,
        URLView.url,
        IFNULL(max(ResourceVersion.time), 0) + ResourceThrottle.throttle as fetchAfter
    from ResourceURL
    inner join ResourceThrottle on ResourceThrottle.resource = ResourceURL.id
    inner join URLView on URLView.resource = ResourceURL.id
    left outer join ResourceVersion on ResourceVersion.resource = ResourceURL.id
    group by ResourceURL.id
) LastFetched
where fetchAfter < round(UNIX_TIMESTAMP(CURTIME(4)) * 1000);