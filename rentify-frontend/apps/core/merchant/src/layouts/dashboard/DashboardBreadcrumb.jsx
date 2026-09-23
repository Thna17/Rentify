import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from '@rentify/utils';
import React from 'react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@rentify/shared/ui/breadcrumb';
import { 
  ALL_TABS
} from '../../config/dashboard-tabs';

export function DashboardBreadcrumb() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const isProductDetail = location.pathname.includes('/products/') && params.id;
  const pathnames = location.pathname.split('/').filter((x) => x);

  const breadcrumbItems = pathnames.map((name, index) => {
    const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
    const isLast = index === pathnames.length - 1;

    let displayName = name;
    if (name === 'dashboard') {
      displayName = t('dashboard.title');
    } else if (name === 'products' && pathnames.length > index + 1) {
      displayName = t('dashboard.product.title');
    } else if (isProductDetail && isLast) {
      displayName = params.id;
    } else {
      // Try to find a matching tab for better naming
      const matchedTab = ALL_TABS.find((tab) => tab.path === name);
      if (matchedTab) {
        displayName = t(matchedTab.name);
      }
    }

    return {
      name: displayName,
      route: routeTo,
      isLast,
    };
  });

  return (
    <Breadcrumb className="hidden md:block">
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={index}>
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage className="text-sm font-semibold capitalize">
                  {item.name}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  href={item.route}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.route);
                  }}
                  className="text-sm font-medium capitalize cursor-pointer hover:text-primary transition-colors"
                >
                  {item.name}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!item.isLast && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default DashboardBreadcrumb;